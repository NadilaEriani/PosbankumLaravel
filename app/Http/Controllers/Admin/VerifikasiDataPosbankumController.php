<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class VerifikasiDataPosbankumController extends Controller
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

    private function addIfExists(array &$payload, string $table, string $column, mixed $value): void
    {
        if ($this->hasColumn($table, $column)) {
            $payload[$column] = $value;
        }
    }

    public function updateDokumenStatus(Request $request, string|int $id): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['disetujui', 'ditolak', 'menunggu'])],
            'catatan' => ['nullable', 'string', 'max:5000'],
            'kategori' => ['nullable', 'string', 'max:100'],
            'id_posbankum' => ['nullable'],
        ]);

        if (!$this->hasTable('data_posbankum')) {
            return back()->withErrors([
                'verifikasi' => 'Tabel data_posbankum tidak ditemukan.',
            ]);
        }

        $idColumn = $this->firstExistingColumn('data_posbankum', ['id_data', 'id', 'uuid']);

        if (!$idColumn) {
            return back()->withErrors([
                'verifikasi' => 'Kolom ID dokumen tidak ditemukan di tabel data_posbankum.',
            ]);
        }

        $status = $validated['status'];
        $note = trim((string) ($validated['catatan'] ?? ''));
        $now = now();
        $payload = [];

        $this->addIfExists($payload, 'data_posbankum', 'status_verifikasi', $status);
        $this->addIfExists($payload, 'data_posbankum', 'status', $status);
        $this->addIfExists($payload, 'data_posbankum', 'tgl_verifikasi', $now);
        $this->addIfExists($payload, 'data_posbankum', 'tanggal_verifikasi', $now);
        $this->addIfExists($payload, 'data_posbankum', 'verified_at', $now);
        $this->addIfExists($payload, 'data_posbankum', 'id_user_verifikator', Auth::id());
        $this->addIfExists($payload, 'data_posbankum', 'verified_by', Auth::id());
        $this->addIfExists($payload, 'data_posbankum', 'updated_at', $now);

        foreach (['catatan_verifikasi', 'catatan_admin', 'alasan_penolakan', 'catatan_penolakan'] as $column) {
            $this->addIfExists($payload, 'data_posbankum', $column, $status === 'ditolak' ? $note : null);
        }

        if (empty($payload)) {
            return back()->withErrors([
                'verifikasi' => 'Tidak ada kolom status verifikasi yang bisa diperbarui di tabel data_posbankum.',
            ]);
        }

        $query = DB::table('data_posbankum')->where($idColumn, $id);

        if (!(clone $query)->exists()) {
            return back()->withErrors([
                'verifikasi' => 'Dokumen tidak ditemukan.',
            ]);
        }

        $query->update($payload);

        $this->createNotification(
            $request->input('id_posbankum'),
            $status,
            $request->input('kategori', 'Dokumen'),
            'data_posbankum',
            $id,
            $note
        );

        return back()->with('success', 'Status dokumen berhasil diperbarui.');
    }

    public function updateTaggingStatus(Request $request, string|int $idPosbankum): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['disetujui', 'ditolak', 'menunggu'])],
            'catatan' => ['nullable', 'string', 'max:5000'],
            'save_location' => ['nullable', 'boolean'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'alamat' => ['nullable', 'string', 'max:1000'],
        ]);

        if (!$this->hasTable('posbankum')) {
            return back()->withErrors([
                'verifikasi' => 'Tabel posbankum tidak ditemukan.',
            ]);
        }

        $idColumn = $this->firstExistingColumn('posbankum', ['id_posbankum', 'id']);

        if (!$idColumn) {
            return back()->withErrors([
                'verifikasi' => 'Kolom ID Posbankum tidak ditemukan.',
            ]);
        }

        $status = $validated['status'];
        $note = trim((string) ($validated['catatan'] ?? ''));
        $now = now();
        $payload = [];

        foreach ([
            'status_verifikasi_tagging_area',
            'status_tagging_area',
            'status_verifikasi_tagging',
            'status_tagging',
            'status_lokasi',
            'status_verifikasi_lokasi',
            'verification_status_location',
        ] as $column) {
            $this->addIfExists($payload, 'posbankum', $column, $status);
        }

        foreach (['tgl_verifikasi_tagging_area', 'tgl_verifikasi_tagging', 'tgl_verifikasi_lokasi'] as $column) {
            $this->addIfExists($payload, 'posbankum', $column, $now);
        }

        foreach (['id_user_verifikator_tagging_area', 'id_user_verifikator_tagging', 'id_user_verifikator_lokasi'] as $column) {
            $this->addIfExists($payload, 'posbankum', $column, Auth::id());
        }

        foreach (['catatan_verifikasi_tagging_area', 'catatan_tagging_area', 'catatan_lokasi'] as $column) {
            $this->addIfExists($payload, 'posbankum', $column, $status === 'ditolak' ? $note : null);
        }

        if ($request->boolean('save_location')) {
            $this->fillLocationPayload($payload, $validated);
        }

        $this->addIfExists($payload, 'posbankum', 'updated_at', $now);

        if (empty($payload)) {
            return back()->withErrors([
                'verifikasi' => 'Tidak ada kolom tagging area yang bisa diperbarui di tabel posbankum.',
            ]);
        }

        $query = DB::table('posbankum')->where($idColumn, $idPosbankum);

        if (!(clone $query)->exists()) {
            return back()->withErrors([
                'verifikasi' => 'Data Posbankum tidak ditemukan.',
            ]);
        }

        $query->update($payload);

        $this->syncTaggingUploadStatus($idPosbankum, $status, $note);
        $this->createNotification($idPosbankum, $status, 'Tagging Area', 'posbankum', $idPosbankum, $note);

        return back()->with('success', 'Status tagging area berhasil diperbarui.');
    }

    public function updateTaggingLocation(Request $request, string|int $idPosbankum): RedirectResponse
    {
        $validated = $request->validate([
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
            'alamat' => ['nullable', 'string', 'max:1000'],
        ]);

        if (!$this->hasTable('posbankum')) {
            return back()->withErrors([
                'verifikasi' => 'Tabel posbankum tidak ditemukan.',
            ]);
        }

        $idColumn = $this->firstExistingColumn('posbankum', ['id_posbankum', 'id']);

        if (!$idColumn) {
            return back()->withErrors([
                'verifikasi' => 'Kolom ID Posbankum tidak ditemukan.',
            ]);
        }

        $query = DB::table('posbankum')->where($idColumn, $idPosbankum);
        $currentRow = (clone $query)->first();

        if (!$currentRow) {
            return back()->withErrors([
                'verifikasi' => 'Data Posbankum tidak ditemukan.',
            ]);
        }

        $payload = [];
        $this->fillLocationPayload($payload, $validated);
        $this->addPendingTaggingStatusIfUnverified($payload, $currentRow);
        $this->addIfExists($payload, 'posbankum', 'updated_at', now());

        if (empty($payload)) {
            return back()->withErrors([
                'verifikasi' => 'Tidak ada kolom lokasi yang bisa diperbarui di tabel posbankum.',
            ]);
        }

        $query->update($payload);

        return back()->with('success', 'Lokasi tagging area berhasil diperbarui.');
    }

    private function hasTaggingVerificationRecord(?object $row): bool
    {
        if (!$row) {
            return false;
        }

        foreach ([
            'tgl_verifikasi_tagging_area',
            'tanggal_verifikasi_tagging_area',
            'tgl_verifikasi_tagging',
            'tgl_verifikasi_lokasi',
            'id_user_verifikator_tagging_area',
            'id_user_verifikator_tagging',
            'id_user_verifikator_lokasi',
        ] as $column) {
            if (property_exists($row, $column) && !empty($row->{$column})) {
                return true;
            }
        }

        return false;
    }

    private function addPendingTaggingStatusIfUnverified(array &$payload, ?object $row): void
    {
        if ($this->hasTaggingVerificationRecord($row)) {
            return;
        }

        foreach ([
            'status_verifikasi_tagging_area',
            'status_tagging_area',
            'status_verifikasi_tagging',
            'status_tagging',
        ] as $column) {
            $this->addIfExists($payload, 'posbankum', $column, 'menunggu');
        }

        foreach (['tgl_verifikasi_tagging_area', 'tgl_verifikasi_tagging', 'tgl_verifikasi_lokasi'] as $column) {
            $this->addIfExists($payload, 'posbankum', $column, null);
        }

        foreach (['id_user_verifikator_tagging_area', 'id_user_verifikator_tagging', 'id_user_verifikator_lokasi'] as $column) {
            $this->addIfExists($payload, 'posbankum', $column, null);
        }

        foreach (['catatan_verifikasi_tagging_area', 'catatan_tagging_area', 'catatan_lokasi'] as $column) {
            $this->addIfExists($payload, 'posbankum', $column, null);
        }
    }

    private function fillLocationPayload(array &$payload, array $validated): void
    {
        $lat = $validated['latitude'] ?? null;
        $lng = $validated['longitude'] ?? null;
        $alamat = $validated['alamat'] ?? null;

        $this->addIfExists($payload, 'posbankum', 'latitude', $lat);
        $this->addIfExists($payload, 'posbankum', 'lat', $lat);
        $this->addIfExists($payload, 'posbankum', 'latitude_pos', $lat);
        $this->addIfExists($payload, 'posbankum', 'longitude', $lng);
        $this->addIfExists($payload, 'posbankum', 'lng', $lng);
        $this->addIfExists($payload, 'posbankum', 'long', $lng);
        $this->addIfExists($payload, 'posbankum', 'longitude_pos', $lng);
        $this->addIfExists($payload, 'posbankum', 'koordinat', $lat . ',' . $lng);
        $this->addIfExists($payload, 'posbankum', 'alamat', $alamat);
    }

    private function syncTaggingUploadStatus(string|int $idPosbankum, string $status, string $note): void
    {
        if (!$this->hasColumn('data_posbankum', 'id_posbankum')) {
            return;
        }

        $kategoriColumn = $this->firstExistingColumn('data_posbankum', ['kategori', 'jenis_dokumen', 'jenis', 'tipe']);
        $idColumn = $this->firstExistingColumn('data_posbankum', ['id_data', 'id', 'uuid']);

        if (!$kategoriColumn || !$idColumn) {
            return;
        }

        $row = DB::table('data_posbankum')
            ->where('id_posbankum', $idPosbankum)
            ->whereIn($kategoriColumn, ['tagging_area', 'Tagging Area', 'tagging area'])
            ->orderByDesc($idColumn)
            ->first();

        if (!$row) {
            return;
        }

        $payload = [];
        $this->addIfExists($payload, 'data_posbankum', 'status_verifikasi', $status);
        $this->addIfExists($payload, 'data_posbankum', 'status', $status);
        $this->addIfExists($payload, 'data_posbankum', 'catatan_verifikasi', $status === 'ditolak' ? $note : null);
        $this->addIfExists($payload, 'data_posbankum', 'catatan_admin', $status === 'ditolak' ? $note : null);
        $this->addIfExists($payload, 'data_posbankum', 'tgl_verifikasi', now());
        $this->addIfExists($payload, 'data_posbankum', 'id_user_verifikator', Auth::id());
        $this->addIfExists($payload, 'data_posbankum', 'updated_at', now());

        if (!empty($payload)) {
            DB::table('data_posbankum')
                ->where($idColumn, $row->{$idColumn})
                ->update($payload);
        }
    }

    private function createNotification(mixed $idPosbankum, string $status, string $label, string $refTable, mixed $refId, string $note = ''): void
    {
        if (!$idPosbankum || !$this->hasTable('notifikasi')) {
            return;
        }

        $approved = $status === 'disetujui';
        $message = $approved
            ? $label . ' telah disetujui oleh admin.'
            : $label . ' ditolak oleh admin.' . ($note ? ' Catatan: ' . $note : '');

        $payload = [];
        $this->addIfExists($payload, 'notifikasi', 'id_posbankum', $idPosbankum);
        $this->addIfExists($payload, 'notifikasi', 'judul', $approved ? 'Dokumen Disetujui' : 'Dokumen Ditolak');
        $this->addIfExists($payload, 'notifikasi', 'pesan', $message);
        $this->addIfExists($payload, 'notifikasi', 'kategori', 'dokumen');
        $this->addIfExists($payload, 'notifikasi', 'prioritas', $approved ? 'sedang' : 'tinggi');
        $this->addIfExists($payload, 'notifikasi', 'ref_table', $refTable);
        $this->addIfExists($payload, 'notifikasi', 'ref_id', $refId);
        $this->addIfExists($payload, 'notifikasi', 'created_at', now());
        $this->addIfExists($payload, 'notifikasi', 'updated_at', now());

        if (!empty($payload)) {
            DB::table('notifikasi')->insert($payload);
        }
    }
}
