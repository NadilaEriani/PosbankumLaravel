<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
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

    private function rowValue(mixed $row, array $keys, mixed $fallback = null): mixed
    {
        foreach ($keys as $key) {
            if (is_array($row) && array_key_exists($key, $row) && $row[$key] !== null && $row[$key] !== '') {
                return $row[$key];
            }

            if (is_object($row) && isset($row->{$key}) && $row->{$key} !== '') {
                return $row->{$key};
            }
        }

        return $fallback;
    }

    private function addIfExists(array &$payload, string $table, string $column, mixed $value): void
    {
        if ($this->hasColumn($table, $column)) {
            $payload[$column] = $value;
        }
    }

    private function makeNotificationPrimaryKey(array &$payload): void
    {
        foreach (['id_notifikasi', 'uuid'] as $column) {
            if ($this->hasColumn('notifikasi', $column) && empty($payload[$column])) {
                $payload[$column] = (string) Str::uuid();
                return;
            }
        }
    }

    private function createKegiatanNotification(mixed $row, string $idKegiatan, string $status, string $catatan = ''): void
    {
        if (!$this->hasTable('notifikasi')) {
            return;
        }

        $idPosbankum = $this->rowValue($row, ['id_posbankum']);
        if (!$idPosbankum) {
            return;
        }

        $approved = strtolower(trim($status)) === 'disetujui';
        $judulKegiatan = (string) $this->rowValue($row, ['judul', 'nama_kegiatan', 'tema'], 'Laporan kegiatan');
        $judulNotif = $approved ? 'Kegiatan Disetujui' : 'Kegiatan Ditolak';

        $pesan = $approved
            ? 'Kegiatan "' . $judulKegiatan . '" sudah disetujui oleh admin.'
            : 'Kegiatan "' . $judulKegiatan . '" ditolak oleh admin.' . (trim($catatan) !== '' ? ' Alasan: ' . trim($catatan) : '');

        $payload = [];
        $this->makeNotificationPrimaryKey($payload);
        $this->addIfExists($payload, 'notifikasi', 'id_posbankum', $idPosbankum);
        $this->addIfExists($payload, 'notifikasi', 'judul', $judulNotif);
        $this->addIfExists($payload, 'notifikasi', 'pesan', $pesan);
        $this->addIfExists($payload, 'notifikasi', 'kategori', 'kegiatan');
        $this->addIfExists($payload, 'notifikasi', 'prioritas', $approved ? 'sedang' : 'tinggi');
        $this->addIfExists($payload, 'notifikasi', 'ref_table', 'kegiatan');
        $this->addIfExists($payload, 'notifikasi', 'ref_id', $idKegiatan);
        $this->addIfExists($payload, 'notifikasi', 'is_read', false);
        $this->addIfExists($payload, 'notifikasi', 'created_at', now());
        $this->addIfExists($payload, 'notifikasi', 'updated_at', now());

        if (!empty($payload)) {
            try {
                DB::table('notifikasi')->insert($payload);

                // Kirim push notification FCM (Pop-Up) ke semua paralegal aktif di Posbankum tersebut
                $paralegalUserIds = DB::table('posbankum_paralegal')
                    ->where('id_posbankum', $idPosbankum)
                    ->where('status', 'aktif')
                    ->pluck('id_user')
                    ->all();

                if (!empty($paralegalUserIds)) {
                    $tokens = DB::table('users')
                        ->whereIn('id_user', $paralegalUserIds)
                        ->whereNotNull('fcm_token')
                        ->where('fcm_token', '!=', '')
                        ->pluck('fcm_token')
                        ->all();

                    foreach ($tokens as $token) {
                        \App\Services\FcmService::sendPush(
                            $token,
                            $judulNotif,
                            $pesan,
                            [
                                'ref_table' => 'kegiatan',
                                'ref_id' => $idKegiatan,
                            ]
                        );
                    }
                }
            } catch (\Throwable $e) {
                // Proses verifikasi kegiatan tidak boleh gagal hanya karena notifikasi gagal dibuat.
            }
        }
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
            $status = 'disetujui';
            $message = 'Laporan kegiatan berhasil disetujui.';
        } elseif (in_array($statusInput, $rejected, true)) {
            $status = 'ditolak';
            $message = 'Laporan kegiatan berhasil ditolak.';
        } else {
            $status = 'menunggu';
            $message = 'Status laporan kegiatan berhasil diperbarui.';
        }

        if ($status === 'ditolak' && trim((string) ($validated['catatan'] ?? '')) === '') {
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

        $catatan = trim((string) ($validated['catatan'] ?? ''));

        $payload = [];
        $this->addColumn($payload, 'kegiatan', 'status', $status);
        $this->addColumn($payload, 'kegiatan', 'catatan', $catatan ?: null);
        $this->addColumn($payload, 'kegiatan', 'catatan_admin', $catatan ?: null);
        $this->addColumn($payload, 'kegiatan', 'alasan_penolakan', $catatan ?: null);
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

        $this->createKegiatanNotification(
            $row,
            $idKegiatan,
            $status,
            $catatan
        );

        return redirect()
            ->back()
            ->with('success', $message);
    }
}