<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class LaporanKegiatanController extends Controller
{
    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function hasColumn(string $table, string $column): bool
    {
        return $this->hasTable($table) && Schema::hasColumn($table, $column);
    }

    private function firstExistingColumn(string $table, array $columns): ?string
    {
        foreach ($columns as $column) {
            if ($this->hasColumn($table, $column)) {
                return $column;
            }
        }

        return null;
    }

    private function addColumn(array &$payload, string $table, string $column, mixed $value): void
    {
        if ($this->hasColumn($table, $column)) {
            $payload[$column] = $value;
        }
    }

    private function kegiatanKeyColumn(): string
    {
        return $this->hasColumn('kegiatan', 'id_kegiatan') ? 'id_kegiatan' : 'id';
    }

    public function updateStatus(Request $request, string $idKegiatan): RedirectResponse
    {
        if (!$this->hasTable('kegiatan')) {
            throw ValidationException::withMessages([
                'database' => 'Tabel kegiatan belum tersedia.',
            ]);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'max:50'],
            'catatan' => ['nullable', 'string', 'max:5000'],
        ], [
            'status.required' => 'Status laporan kegiatan wajib diisi.',
        ]);

        $statusInput = strtolower(trim((string) $validated['status']));

        $accepted = [
            'diterima',
            'disetujui',
            'setuju',
            'approved',
            'approve',
            'valid',
            'selesai',
        ];

        $rejected = [
            'ditolak',
            'tolak',
            'rejected',
            'reject',
        ];

        if (in_array($statusInput, $accepted, true)) {
            $status = 'Diterima';
            $message = 'Laporan kegiatan berhasil disetujui.';
        } elseif (in_array($statusInput, $rejected, true)) {
            $status = 'Ditolak';
            $message = 'Laporan kegiatan berhasil ditolak.';
        } else {
            $status = 'Menunggu';
            $message = 'Status laporan kegiatan berhasil diperbarui.';
        }

        if ($status === 'Ditolak' && trim((string) ($validated['catatan'] ?? '')) === '') {
            throw ValidationException::withMessages([
                'catatan' => 'Catatan penolakan wajib diisi.',
            ]);
        }

        $keyColumn = $this->kegiatanKeyColumn();
        $row = DB::table('kegiatan')
            ->where($keyColumn, $idKegiatan)
            ->first();

        if (!$row) {
            throw ValidationException::withMessages([
                'id_kegiatan' => 'Laporan kegiatan tidak ditemukan.',
            ]);
        }

        $payload = [];
        $this->addColumn($payload, 'kegiatan', 'status', $status);
        $this->addColumn($payload, 'kegiatan', 'catatan', trim((string) ($validated['catatan'] ?? '')) ?: null);
        $this->addColumn($payload, 'kegiatan', 'catatan_admin', trim((string) ($validated['catatan'] ?? '')) ?: null);
        $this->addColumn($payload, 'kegiatan', 'alasan_penolakan', trim((string) ($validated['catatan'] ?? '')) ?: null);
        $this->addColumn($payload, 'kegiatan', 'tgl_verifikasi', now());
        $this->addColumn($payload, 'kegiatan', 'updated_at', now());

        $verifikatorColumn = $this->firstExistingColumn('kegiatan', [
            'id_user_verifikator',
            'verified_by',
            'verifikator_id',
        ]);

        if ($verifikatorColumn) {
            $user = $request->user();
            $payload[$verifikatorColumn] = $user->id_user ?? $user->id ?? $user?->getKey();
        }

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'database' => 'Tidak ada kolom kegiatan yang dapat diperbarui.',
            ]);
        }

        DB::table('kegiatan')
            ->where($keyColumn, $idKegiatan)
            ->update($payload);

        return redirect()
            ->to('/admin/laporan-kegiatan')
            ->with('success', $message);
    }
}
