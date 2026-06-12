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

class KelolaPosbankumController extends Controller
{
    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function hasColumn(string $table, string $column): bool
    {
        return $this->hasTable($table) && Schema::hasColumn($table, $column);
    }

    private function addColumn(array &$payload, string $table, string $column, mixed $value): void
    {
        if ($this->hasColumn($table, $column)) {
            $payload[$column] = $value;
        }
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
                if ($found)
                    return $found;
            }

            if ($this->hasColumn('paralegal_members', 'user_id') && isset($user->id)) {
                $found = DB::table('paralegal_members')->where('user_id', $user->id)->value('id_posbankum');
                if ($found)
                    return $found;
            }

            foreach (['email', 'email_akun', 'email_paralegal'] as $column) {
                if ($this->hasColumn('paralegal_members', $column) && !empty($user->email)) {
                    $found = DB::table('paralegal_members')->where($column, $user->email)->value('id_posbankum');
                    if ($found)
                        return $found;
                }
            }
        }

        return null;
    }

    private function dataKeyColumn(): string
    {
        return $this->hasColumn('data_posbankum', 'id_data') ? 'id_data' : 'id';
    }

    private function deleteStoredFile(?string $path): void
    {
        $clean = trim((string) $path);
        if ($clean === '' || preg_match('/^(https?:|data:|blob:)/i', $clean)) {
            return;
        }

        $clean = str_replace('\\', '/', $clean);
        $clean = preg_replace('#^/storage/#', '', $clean);
        $clean = preg_replace('#^storage/#', '', $clean);
        $clean = preg_replace('#^public/#', '', $clean);

        if ($clean && Storage::disk('public')->exists($clean)) {
            Storage::disk('public')->delete($clean);
        }
    }

    private function canonicalKategori(mixed $value): string
    {
        $raw = strtolower(trim((string) $value));
        $raw = preg_replace('/[\s\-]+/', '_', $raw);

        return match ($raw) {
            'sk_posbankum', 'sk_pos_bankum' => 'sk_posbankum',
            'sk_kadarkum', 'sk_kab_kota', 'sk_kabupaten_kota' => 'sk_kadarkum',
            'sapras', 'sarpras', 'dokumentasi_sapras', 'dokumentasi_sarpras' => 'sarpras',
            default => $raw,
        };
    }

    private function isSaprasCategory(mixed $value): bool
    {
        return $this->canonicalKategori($value) === 'sarpras';
    }

    private function fileStatusKind(mixed $status): string
    {
        $value = strtolower(trim((string) $status));

        if (in_array($value, ['diterima', 'disetujui', 'approved', 'valid'], true)) {
            return 'ok';
        }

        if (in_array($value, ['ditolak', 'rejected', 'tolak'], true)) {
            return 'bad';
        }

        return 'wait';
    }

    private function uploadedDokumenFiles(Request $request): array
    {
        if (!$request->hasFile('dokumen')) {
            return [];
        }

        $uploaded = $request->file('dokumen');
        $files = is_array($uploaded) ? $uploaded : [$uploaded];

        return array_values(array_filter($files));
    }

    private function matchingCategoryQuery(mixed $idPosbankum, string $kategori)
    {
        $query = DB::table('data_posbankum');

        if ($this->hasColumn('data_posbankum', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        $aliases = match ($kategori) {
            'sk_posbankum' => ['sk_posbankum', 'sk posbankum', 'sk pos bankum'],
            'sk_kadarkum' => ['sk_kadarkum', 'sk kadarkum', 'sk kab/kota', 'sk kab kota', 'sk kabupaten/kota'],
            'sarpras' => ['sarpras', 'sapras', 'dokumentasi sarpras', 'dokumentasi sapras', 'dokumentasi_sarpras', 'dokumentasi_sapras'],
            default => [$kategori],
        };

        $categoryColumns = array_values(array_filter(['kategori', 'jenis_dokumen', 'jenis', 'tipe'], fn($column) => $this->hasColumn('data_posbankum', $column)));

        if (!empty($categoryColumns)) {
            $query->where(function ($inner) use ($categoryColumns, $aliases) {
                foreach ($categoryColumns as $column) {
                    $inner->orWhereIn($column, $aliases);
                }
            });
        }

        return $query;
    }

    private function makeDataPrimaryKey(array &$payload): void
    {
        foreach (['id_data', 'uuid'] as $column) {
            if ($this->hasColumn('data_posbankum', $column) && empty($payload[$column])) {
                $payload[$column] = (string) Str::uuid();
                return;
            }
        }
    }

    public function storeDocument(Request $request): RedirectResponse
    {
        if (!$this->hasTable('data_posbankum')) {
            throw ValidationException::withMessages([
                'dokumen' => 'Tabel data_posbankum belum tersedia.',
            ]);
        }

        $data = $request->validate([
            'kategori' => ['required', 'string', 'max:80'],
        ], [
            'kategori.required' => 'Kategori dokumen wajib dipilih.',
        ]);

        $files = $this->uploadedDokumenFiles($request);

        if (empty($files)) {
            throw ValidationException::withMessages([
                'dokumen' => 'File dokumen wajib dipilih.',
            ]);
        }

        if (is_array($request->file('dokumen'))) {
            $request->validate([
                'dokumen' => ['required', 'array'],
                'dokumen.*' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            ], [
                'dokumen.array' => 'File dokumen tidak valid.',
                'dokumen.*.file' => 'Salah satu file dokumen tidak valid.',
                'dokumen.*.mimes' => 'Format file harus PDF, JPG, JPEG, atau PNG.',
                'dokumen.*.max' => 'Ukuran file maksimal 5MB.',
            ]);
        } else {
            $request->validate([
                'dokumen' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            ], [
                'dokumen.file' => 'File dokumen tidak valid.',
                'dokumen.mimes' => 'Format file harus PDF, JPG, JPEG, atau PNG.',
                'dokumen.max' => 'Ukuran file maksimal 5MB.',
            ]);
        }

        $idPosbankum = $this->resolveUserPosbankumId($request->user());
        if (!$idPosbankum) {
            throw ValidationException::withMessages([
                'dokumen' => 'ID Posbankum tidak ditemukan pada akun ini.',
            ]);
        }

        $kategori = $this->canonicalKategori($data['kategori']);
        $isSapras = $this->isSaprasCategory($kategori);

        if (!$isSapras && count($files) > 1) {
            $files = [reset($files)];
        }

        $existingRows = collect();
        if (!$isSapras) {
            $existingRows = $this->matchingCategoryQuery($idPosbankum, $kategori)->get();

            $hasApproved = $existingRows->contains(function ($row) {
                return $this->fileStatusKind($row->status_verifikasi ?? $row->status ?? '') === 'ok';
            });

            if ($hasApproved) {
                throw ValidationException::withMessages([
                    'dokumen' => 'Dokumen yang sudah diterima tidak dapat diganti.',
                ]);
            }
        }

        $storedPaths = [];
        $oldPaths = [];
        $insertPayloads = [];
        $keyColumn = $this->dataKeyColumn();

        try {
            foreach ($files as $file) {
                $extension = strtolower($file->getClientOriginalExtension() ?: 'pdf');
                $safeName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
                $filename = now()->format('YmdHis') . '-' . Str::random(8) . '-' . ($safeName ?: Str::uuid()->toString()) . '.' . $extension;
                $folder = 'posbankum-docs/' . preg_replace('/[^A-Za-z0-9_\-]/', '-', (string) $idPosbankum) . '/' . $kategori;
                $path = $file->storeAs($folder, $filename, 'public');
                $storedPaths[] = $path;

                $payload = [];
                $this->makeDataPrimaryKey($payload);
                $this->addColumn($payload, 'data_posbankum', 'id_posbankum', $idPosbankum);
                $this->addColumn($payload, 'data_posbankum', 'kategori', $kategori);
                $this->addColumn($payload, 'data_posbankum', 'jenis_dokumen', $kategori);
                $this->addColumn($payload, 'data_posbankum', 'path_berkas', $path);
                $this->addColumn($payload, 'data_posbankum', 'path_file', $path);
                $this->addColumn($payload, 'data_posbankum', 'nama_berkas', $file->getClientOriginalName());
                $this->addColumn($payload, 'data_posbankum', 'nama_file', $file->getClientOriginalName());
                $this->addColumn($payload, 'data_posbankum', 'mime_type', $file->getMimeType());
                $this->addColumn($payload, 'data_posbankum', 'size_bytes', $file->getSize());
                $this->addColumn($payload, 'data_posbankum', 'status_verifikasi', 'menunggu');
                $this->addColumn($payload, 'data_posbankum', 'status', 'menunggu');
                $this->addColumn($payload, 'data_posbankum', 'catatan_admin', null);
                $this->addColumn($payload, 'data_posbankum', 'catatan_penolakan', null);
                $this->addColumn($payload, 'data_posbankum', 'alasan_penolakan', null);
                $this->addColumn($payload, 'data_posbankum', 'tgl_upload', now());
                $this->addColumn($payload, 'data_posbankum', 'created_at', now());
                $this->addColumn($payload, 'data_posbankum', 'updated_at', now());

                if (empty($payload)) {
                    throw ValidationException::withMessages([
                        'dokumen' => 'Kolom tabel data_posbankum belum sesuai.',
                    ]);
                }

                $insertPayloads[] = $payload;
            }

            DB::transaction(function () use ($isSapras, $existingRows, $keyColumn, $insertPayloads, $idPosbankum, $kategori, &$oldPaths) {
                if (!$isSapras && $existingRows->isNotEmpty()) {
                    $idsToDelete = [];

                    foreach ($existingRows as $row) {
                        $rowId = $row->{$keyColumn} ?? null;
                        if ($rowId !== null && $rowId !== '') {
                            $idsToDelete[] = $rowId;
                        }

                        $oldPaths[] = $row->path_berkas ?? $row->path_file ?? $row->path ?? null;
                    }

                    if (!empty($idsToDelete)) {
                        DB::table('data_posbankum')->whereIn($keyColumn, $idsToDelete)->delete();
                    } else {
                        $this->matchingCategoryQuery($idPosbankum, $kategori)->delete();
                    }
                }

                foreach ($insertPayloads as $payload) {
                    DB::table('data_posbankum')->insert($payload);
                }
            });
        } catch (\Throwable $exception) {
            foreach ($storedPaths as $path) {
                $this->deleteStoredFile($path);
            }

            throw $exception;
        }

        foreach ($oldPaths as $path) {
            $this->deleteStoredFile($path);
        }

        $message = $isSapras && count($files) > 1
            ? 'Dokumentasi Sapras berhasil dikirim untuk verifikasi admin.'
            : 'Dokumen berhasil dikirim untuk verifikasi admin.';

        return back()->with('success', $message);
    }

    public function destroyDocument(Request $request, mixed $id): RedirectResponse
    {
        if (!$this->hasTable('data_posbankum')) {
            abort(404);
        }

        $keyColumn = $this->dataKeyColumn();
        $row = DB::table('data_posbankum')->where($keyColumn, $id)->first();

        if (!$row) {
            abort(404);
        }

        $idPosbankum = $this->resolveUserPosbankumId($request->user());
        if ($idPosbankum && $this->hasColumn('data_posbankum', 'id_posbankum') && (string) $row->id_posbankum !== (string) $idPosbankum) {
            abort(403);
        }

        $status = strtolower((string) ($row->status_verifikasi ?? $row->status ?? ''));
        if (in_array($status, ['diterima', 'disetujui', 'approved', 'valid'], true)) {
            throw ValidationException::withMessages([
                'dokumen' => 'Dokumen yang sudah diterima tidak dapat dihapus dari halaman Posbankum.',
            ]);
        }

        $path = $row->path_berkas ?? $row->path_file ?? $row->path ?? null;
        DB::table('data_posbankum')->where($keyColumn, $id)->delete();
        $this->deleteStoredFile($path);

        return back()->with('success', 'Dokumen berhasil dihapus.');
    }

    public function updateLocation(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'alamat' => ['nullable', 'string', 'max:1000'],
        ], [
            'lat.numeric' => 'Latitude harus berupa angka.',
            'lng.numeric' => 'Longitude harus berupa angka.',
        ]);

        if (!$this->hasTable('posbankum')) {
            throw ValidationException::withMessages([
                'alamat' => 'Tabel posbankum belum tersedia.',
            ]);
        }

        $idPosbankum = $this->resolveUserPosbankumId($request->user());
        if (!$idPosbankum) {
            throw ValidationException::withMessages([
                'alamat' => 'ID Posbankum tidak ditemukan pada akun ini.',
            ]);
        }

        $payload = [];
        foreach (['latitude', 'lat', 'latitude_pos', 'lat_pos', 'lattitude'] as $column) {
            if ($this->hasColumn('posbankum', $column)) {
                $payload[$column] = $data['lat'] ?? null;
                break;
            }
        }

        foreach (['longitude', 'lng', 'long', 'longitude_pos', 'lng_pos', 'long_pos'] as $column) {
            if ($this->hasColumn('posbankum', $column)) {
                $payload[$column] = $data['lng'] ?? null;
                break;
            }
        }

        if ($this->hasColumn('posbankum', 'koordinat')) {
            $payload['koordinat'] = (($data['lat'] ?? '') !== '' && ($data['lng'] ?? '') !== '')
                ? ($data['lat'] . ',' . $data['lng'])
                : null;
        }

        if (!empty($data['alamat'])) {
            $this->addColumn($payload, 'posbankum', 'alamat', trim($data['alamat']));
            $this->addColumn($payload, 'posbankum', 'address', trim($data['alamat']));
        }

        foreach (['status_lokasi', 'status_tagging', 'status_verifikasi_lokasi', 'status_verifikasi_tagging'] as $column) {
            if ($this->hasColumn('posbankum', $column)) {
                $payload[$column] = 'menunggu';
                break;
            }
        }

        $this->addColumn($payload, 'posbankum', 'updated_at', now());

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'alamat' => 'Kolom lokasi belum tersedia pada tabel posbankum.',
            ]);
        }

        $idColumn = $this->hasColumn('posbankum', 'id_posbankum') ? 'id_posbankum' : 'id';
        DB::table('posbankum')->where($idColumn, $idPosbankum)->update($payload);

        return back()->with('success', 'Lokasi Posbankum berhasil diperbarui.');
    }
}
