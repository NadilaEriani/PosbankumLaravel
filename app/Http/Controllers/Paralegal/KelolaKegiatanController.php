<?php

namespace App\Http\Controllers\Paralegal;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class KelolaKegiatanController extends Controller
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

    private function rowValue(array|object|null $row, array $keys, mixed $default = null): mixed
    {
        $data = (array) ($row ?? []);

        foreach ($keys as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {
                return $data[$key];
            }
        }

        return $default;
    }

    private function blankToNull(mixed $value): ?string
    {
        $clean = trim((string) ($value ?? ''));

        return $clean === '' ? null : $clean;
    }

    private function resolveUserPosbankumId($user): mixed
    {
        if (!$user) {
            return null;
        }

        foreach (['id_posbankum', 'posbankum_id', 'id_posbankum_fk'] as $key) {
            if (!empty($user->{$key})) {
                return $user->{$key};
            }
        }


        if ($this->hasTable('posbankum_paralegal')) {
            $query = DB::table('posbankum_paralegal');

            if ($this->hasColumn('posbankum_paralegal', 'status')) {
                $query->where('status', 'aktif');
            }

            if ($this->hasColumn('posbankum_paralegal', 'id_user')) {
                $userId = $user->id_user ?? $user->id ?? null;

                if ($userId) {
                    $found = (clone $query)
                        ->where('id_user', $userId)
                        ->value('id_posbankum');

                    if ($found) {
                        return $found;
                    }
                }
            }
        }

        if ($this->hasTable('paralegal_members')) {
            if ($this->hasColumn('paralegal_members', 'id_user') && isset($user->id_user)) {
                $found = DB::table('paralegal_members')->where('id_user', $user->id_user)->value('id_posbankum');
                if ($found) {
                    return $found;
                }
            }

            if ($this->hasColumn('paralegal_members', 'user_id') && isset($user->id)) {
                $found = DB::table('paralegal_members')->where('user_id', $user->id)->value('id_posbankum');
                if ($found) {
                    return $found;
                }
            }

            foreach (['email', 'email_akun', 'email_paralegal'] as $column) {
                if ($this->hasColumn('paralegal_members', $column) && !empty($user->email)) {
                    $found = DB::table('paralegal_members')->where($column, $user->email)->value('id_posbankum');
                    if ($found) {
                        return $found;
                    }
                }
            }
        }

        return null;
    }

    private function kegiatanKeyColumn(): string
    {
        return $this->hasColumn('kegiatan', 'id_kegiatan') ? 'id_kegiatan' : 'id';
    }

    private function findKegiatanForUser(Request $request, mixed $id): object
    {
        if (!$this->hasTable('kegiatan')) {
            throw ValidationException::withMessages([
                'database' => 'Tabel kegiatan belum tersedia.',
            ]);
        }

        $keyColumn = $this->kegiatanKeyColumn();
        $query = DB::table('kegiatan')->where($keyColumn, $id);

        $idPosbankum = $this->resolveUserPosbankumId($request->user());

        if ($idPosbankum && $this->hasColumn('kegiatan', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        $row = $query->first();

        if (!$row) {
            throw ValidationException::withMessages([
                'kegiatan' => 'Data kegiatan tidak ditemukan atau bukan milik Posbankum ini.',
            ]);
        }

        return $row;
    }

    private function cleanStoragePath(?string $path): string
    {
        $clean = trim((string) $path);

        if ($clean === '' || preg_match('/^(https?:|data:|blob:)/i', $clean)) {
            return '';
        }

        $clean = str_replace('\\', '/', $clean);
        $clean = preg_replace('#^/storage/#', '', $clean);
        $clean = preg_replace('#^storage/#', '', $clean);
        $clean = preg_replace('#^public/#', '', $clean);

        return trim($clean, '/');
    }

    private function deleteThumbnail(?string $path): void
    {
        $clean = $this->cleanStoragePath($path);

        if ($clean && Storage::disk('public')->exists($clean)) {
            Storage::disk('public')->delete($clean);
        }
    }

    private function storeThumbnail(Request $request, mixed $idPosbankum): ?string
    {
        if (!$request->hasFile('thumbnail')) {
            return null;
        }

        $file = $request->file('thumbnail');

        if (!$file || !$file->isValid()) {
            return null;
        }

        $safeName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = now()->format('YmdHis') . '-' . Str::random(10) . '-' . ($safeName ?: 'kegiatan') . '.' . $extension;

        return $file->storeAs(
            'kegiatan-thumbnails/posbankum/' . preg_replace('/[^A-Za-z0-9_\-]/', '-', (string) $idPosbankum),
            $filename,
            'public'
        );
    }

    private function anggotaPayload(Request $request): string
    {
        $raw = $request->input('anggota_terlibat');

        if (is_array($raw)) {
            $items = $raw;
        } else {
            $decoded = json_decode((string) $raw, true);
            $items = is_array($decoded) ? $decoded : [];
        }

        $items = collect($items)
            ->map(fn($item) => trim((string) $item))
            ->filter()
            ->unique()
            ->values()
            ->all();

        return json_encode($items, JSON_UNESCAPED_UNICODE);
    }

    private function validated(Request $request): array
    {
        return $request->validate(
            [
                'judul' => ['required', 'string', 'max:255'],
                'deskripsi' => ['nullable', 'string', 'max:5000'],
                'tgl_mulai' => ['required', 'date'],
                'tgl_selesai' => ['nullable', 'date', 'after_or_equal:tgl_mulai'],
                'lokasi' => ['required', 'string', 'max:255'],
                'jumlah_peserta' => ['nullable', 'integer', 'min:0'],
                'hasil_kegiatan' => ['nullable', 'string', 'max:5000'],
                'anggota_terlibat' => ['nullable'],
                'thumbnail' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
                'remove_thumbnail' => ['nullable', 'boolean'],
                'resubmit_rejected' => ['nullable', 'boolean'],
            ],
            [
                'judul.required' => 'Judul kegiatan wajib diisi.',
                'tgl_mulai.required' => 'Tanggal mulai wajib diisi.',
                'tgl_selesai.after_or_equal' => 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
                'lokasi.required' => 'Lokasi wajib diisi.',
                'jumlah_peserta.integer' => 'Jumlah peserta harus berupa angka.',
                'thumbnail.file' => 'Dokumentasi harus berupa file yang valid.',
                'thumbnail.mimes' => 'Dokumentasi harus berformat JPG, JPEG, PNG, WEBP, atau PDF.',
                'thumbnail.max' => 'Ukuran thumbnail maksimal 5MB.',
            ]
        );
    }

    private function buildPayload(Request $request, ?string $thumbnailPath, bool $isCreate = false, bool $resubmitRejected = false): array
    {
        $payload = [];

        $judul = trim((string) $request->input('judul'));
        $deskripsi = $this->blankToNull($request->input('deskripsi'));
        $lokasi = trim((string) $request->input('lokasi'));
        $jumlahPeserta = $request->filled('jumlah_peserta') ? (int) $request->input('jumlah_peserta') : null;
        $hasil = $this->blankToNull($request->input('hasil_kegiatan'));
        $anggota = $this->anggotaPayload($request);

        $this->addColumn($payload, 'kegiatan', 'judul', $judul);
        $this->addColumn($payload, 'kegiatan', 'nama_kegiatan', $judul);

        if ($this->hasColumn('kegiatan', 'deskripsi')) {
            $payload['deskripsi'] = $deskripsi;
        } elseif ($this->hasColumn('kegiatan', 'keterangan')) {
            $payload['keterangan'] = $deskripsi;
        } elseif ($this->hasColumn('kegiatan', 'catatan')) {
            $payload['catatan'] = $deskripsi;
        }

        $this->addColumn($payload, 'kegiatan', 'tgl_mulai', $request->input('tgl_mulai'));
        $this->addColumn($payload, 'kegiatan', 'tanggal_kegiatan', $request->input('tgl_mulai'));
        $this->addColumn($payload, 'kegiatan', 'tanggal', $request->input('tgl_mulai'));
        $this->addColumn($payload, 'kegiatan', 'tgl_selesai', $request->input('tgl_selesai') ?: null);

        $this->addColumn($payload, 'kegiatan', 'lokasi', $lokasi);
        $this->addColumn($payload, 'kegiatan', 'tempat', $lokasi);
        $this->addColumn($payload, 'kegiatan', 'alamat', $lokasi);
        $this->addColumn($payload, 'kegiatan', 'location', $lokasi);

        $this->addColumn($payload, 'kegiatan', 'jumlah_peserta', $jumlahPeserta);
        $this->addColumn($payload, 'kegiatan', 'target_peserta', $jumlahPeserta);
        $this->addColumn($payload, 'kegiatan', 'peserta', $jumlahPeserta);

        $this->addColumn($payload, 'kegiatan', 'hasil_kegiatan', $hasil);

        $this->addColumn($payload, 'kegiatan', 'anggota_terlibat', $anggota);
        $this->addColumn($payload, 'kegiatan', 'anggota', $anggota);
        $this->addColumn($payload, 'kegiatan', 'peserta_terlibat', $anggota);
        $this->addColumn($payload, 'kegiatan', 'tim_terlibat', $anggota);

        $this->addColumn($payload, 'kegiatan', 'thumbnail_path', $thumbnailPath);
        $this->addColumn($payload, 'kegiatan', 'gambar', $thumbnailPath);
        $this->addColumn($payload, 'kegiatan', 'image', $thumbnailPath);

        if ($isCreate) {
            $idPosbankum = $this->resolveUserPosbankumId($request->user());
            $userId = $request->user()?->id_user ?? $request->user()?->id ?? null;

            $this->addColumn($payload, 'kegiatan', 'id_posbankum', $idPosbankum);
            $this->addColumn($payload, 'kegiatan', 'created_by', $userId);
            $this->addColumn($payload, 'kegiatan', 'status', 'Diproses');
            $this->addColumn($payload, 'kegiatan', 'tgl_upload', now());
            $this->addColumn($payload, 'kegiatan', 'created_at', now());
        }

        if ($resubmitRejected) {
            $this->addColumn($payload, 'kegiatan', 'status', 'Diproses');
            $this->addColumn($payload, 'kegiatan', 'tgl_upload', now());
        }

        $this->addColumn($payload, 'kegiatan', 'updated_at', now());

        return $payload;
    }

    public function store(Request $request): RedirectResponse
    {
        if (!$this->hasTable('kegiatan')) {
            throw ValidationException::withMessages([
                'database' => 'Tabel kegiatan belum tersedia.',
            ]);
        }

        $this->validated($request);

        $idPosbankum = $this->resolveUserPosbankumId($request->user());

        if (!$idPosbankum && $this->hasColumn('kegiatan', 'id_posbankum')) {
            throw ValidationException::withMessages([
                'id_posbankum' => 'ID Posbankum tidak ditemukan. Silakan login ulang.',
            ]);
        }

        $thumbnailPath = $this->storeThumbnail($request, $idPosbankum ?: 'umum');
        $payload = $this->buildPayload($request, $thumbnailPath, true, false);

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'database' => 'Tidak ada kolom kegiatan yang bisa disimpan.',
            ]);
        }

        DB::table('kegiatan')->insert($payload);

        return redirect()
            ->back()
            ->with('success', 'Kegiatan berhasil ditambahkan!');
    }

    public function update(Request $request, mixed $id): RedirectResponse
    {
        $this->validated($request);

        $row = $this->findKegiatanForUser($request, $id);
        $idPosbankum = $this->resolveUserPosbankumId($request->user());
        $oldThumbnail = (string) $this->rowValue($row, ['thumbnail_path', 'gambar', 'image'], '');
        $thumbnailPath = $oldThumbnail;

        if ($request->hasFile('thumbnail')) {
            $thumbnailPath = $this->storeThumbnail($request, $idPosbankum ?: 'umum');
        } elseif ($request->boolean('remove_thumbnail')) {
            $thumbnailPath = null;
        }

        $payload = $this->buildPayload(
            $request,
            $thumbnailPath,
            false,
            $request->boolean('resubmit_rejected')
        );

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'database' => 'Tidak ada kolom kegiatan yang bisa diperbarui.',
            ]);
        }

        DB::table('kegiatan')
            ->where($this->kegiatanKeyColumn(), $id)
            ->update($payload);

        if (($request->hasFile('thumbnail') || $request->boolean('remove_thumbnail')) && $oldThumbnail && $oldThumbnail !== $thumbnailPath) {
            $this->deleteThumbnail($oldThumbnail);
        }

        return redirect()
            ->back()
            ->with(
                'success',
                $request->boolean('resubmit_rejected')
                ? 'Kegiatan berhasil dikirim ulang untuk ditinjau admin!'
                : 'Kegiatan berhasil diperbarui!'
            );
    }

    public function destroy(Request $request, mixed $id): RedirectResponse
    {
        $row = $this->findKegiatanForUser($request, $id);
        $thumbnail = (string) $this->rowValue($row, ['thumbnail_path', 'gambar', 'image'], '');

        DB::table('kegiatan')
            ->where($this->kegiatanKeyColumn(), $id)
            ->delete();

        if ($thumbnail) {
            $this->deleteThumbnail($thumbnail);
        }

        return redirect()
            ->back()
            ->with('success', 'Kegiatan berhasil dihapus!');
    }
}
