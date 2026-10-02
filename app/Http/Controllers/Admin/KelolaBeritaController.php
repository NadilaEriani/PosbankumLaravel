<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class KelolaBeritaController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'judul' => ['required', 'string', 'max:255'],
            'kategori' => ['nullable', 'string', 'max:100'],
            'isi' => ['required', 'string'],
            'gambar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        try {
            DB::transaction(function () use ($request) {
                $payload = $this->buildPayload($request, false);

                $imageColumn = $this->imageColumn();
                $imageFile = $this->imageFile($request);

                if ($imageColumn && $imageFile) {
                    $payload[$imageColumn] = $this->storeImage($imageFile);
                }

                DB::table('berita')->insert($payload);
            });
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'database' => $e->getMessage() ?: 'Gagal menyimpan berita.',
            ]);
        }

        return $this->redirectToKelolaBerita('Berita berhasil ditambahkan.');
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $request->validate([
            'judul' => ['required', 'string', 'max:255'],
            'kategori' => ['nullable', 'string', 'max:100'],
            'isi' => ['required', 'string'],
            'gambar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $keyColumn = $this->keyColumn();

        $oldRow = DB::table('berita')
            ->where($keyColumn, $id)
            ->first();

        if (!$oldRow) {
            throw ValidationException::withMessages([
                'id' => 'Berita tidak ditemukan.',
            ]);
        }

        try {
            DB::transaction(function () use ($request, $id, $oldRow, $keyColumn) {
                $payload = $this->buildPayload($request, true);

                $imageColumn = $this->imageColumn();
                $imageFile = $this->imageFile($request);

                if ($imageColumn && $imageFile) {
                    $oldPath = $oldRow->{$imageColumn} ?? null;

                    if ($oldPath) {
                        $this->deleteImage($oldPath);
                    }

                    $payload[$imageColumn] = $this->storeImage($imageFile);
                }

                if (!$imageFile && $request->boolean('remove_gambar') && $imageColumn) {
                    $oldPath = $oldRow->{$imageColumn} ?? null;

                    if ($oldPath) {
                        $this->deleteImage($oldPath);
                    }

                    $payload[$imageColumn] = null;
                }

                DB::table('berita')
                    ->where($keyColumn, $id)
                    ->update($payload);
            });
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'database' => $e->getMessage() ?: 'Gagal memperbarui berita.',
            ]);
        }

        return $this->redirectToKelolaBerita('Berita berhasil diperbarui.');
    }

    public function updateStatus(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:aktif,nonaktif'],
        ]);

        $keyColumn = $this->keyColumn();
        $statusColumn = $this->statusColumn();

        if (!$statusColumn) {
            throw ValidationException::withMessages([
                'status' => 'Kolom status berita belum tersedia di database.',
            ]);
        }

        $rowExists = DB::table('berita')
            ->where($keyColumn, $id)
            ->exists();

        if (!$rowExists) {
            throw ValidationException::withMessages([
                'id' => 'Berita tidak ditemukan.',
            ]);
        }

        try {
            DB::transaction(function () use ($id, $keyColumn, $statusColumn, $validated) {
                $payload = [
                    $statusColumn => $this->databaseStatusValue($statusColumn, $validated['status']),
                ];

                if (Schema::hasColumn('berita', 'updated_at')) {
                    $payload['updated_at'] = now();
                }

                DB::table('berita')
                    ->where($keyColumn, $id)
                    ->update($payload);
            });
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'database' => $e->getMessage() ?: 'Gagal mengubah status berita.',
            ]);
        }

        return redirect()->to('/admin/kelola-berita');
    }

    public function destroy(string $id): RedirectResponse
    {
        $keyColumn = $this->keyColumn();

        $row = DB::table('berita')
            ->where($keyColumn, $id)
            ->first();

        if (!$row) {
            throw ValidationException::withMessages([
                'id' => 'Berita tidak ditemukan.',
            ]);
        }

        try {
            DB::transaction(function () use ($id, $row, $keyColumn) {
                $imageColumn = $this->imageColumn();

                if ($imageColumn && !empty($row->{$imageColumn})) {
                    $this->deleteImage($row->{$imageColumn});
                }

                DB::table('berita')
                    ->where($keyColumn, $id)
                    ->delete();
            });
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'database' => $e->getMessage() ?: 'Gagal menghapus berita.',
            ]);
        }

        return $this->redirectToKelolaBerita('Berita berhasil dihapus.');
    }

    private function buildPayload(Request $request, bool $isUpdate = false): array
    {
        $payload = [];

        if (!$isUpdate && Schema::hasColumn('berita', 'id_berita')) {
            $payload['id_berita'] = (string) Str::uuid();
        }

        if (!$isUpdate && Schema::hasColumn('berita', 'id_user')) {
            $payload['id_user'] = $this->currentUserId($request);
        }

        if (!$isUpdate && ($statusColumn = $this->statusColumn())) {
            $payload[$statusColumn] = $this->databaseStatusValue($statusColumn, 'aktif');
        }

        if (Schema::hasColumn('berita', 'judul')) {
            $payload['judul'] = $request->input('judul');
        }

        if (Schema::hasColumn('berita', 'kategori')) {
            $payload['kategori'] = $request->input('kategori');
        }

        if (Schema::hasColumn('berita', 'isi')) {
            $payload['isi'] = $request->input('isi');
        }

        if (Schema::hasColumn('berita', 'konten')) {
            $payload['konten'] = $request->input('isi');
        }

        if (Schema::hasColumn('berita', 'deskripsi')) {
            $payload['deskripsi'] = $request->input('isi');
        }

        if (!$isUpdate && Schema::hasColumn('berita', 'tgl_publish')) {
            $payload['tgl_publish'] = now();
        }

        if (Schema::hasColumn('berita', 'updated_at')) {
            $payload['updated_at'] = now();
        }

        if (!$isUpdate && Schema::hasColumn('berita', 'created_at')) {
            $payload['created_at'] = now();
        }

        return $payload;
    }

    private function currentUserId(Request $request): ?string
    {
        $user = $request->user();

        if (!$user) {
            return null;
        }

        return $user->id_user
            ?? $user->id
            ?? null;
    }

    private function imageFile(Request $request)
    {
        if ($request->hasFile('gambar')) {
            return $request->file('gambar');
        }

        if ($request->hasFile('thumbnail')) {
            return $request->file('thumbnail');
        }

        if ($request->hasFile('image')) {
            return $request->file('image');
        }

        return null;
    }

    private function storeImage($file): string
    {
        $extension = $file->extension(); // ekstensi dari isi file, bukan nama kiriman
        $filename = Str::uuid()->toString() . '.' . $extension;

        return $file->storeAs('berita', $filename, 'public');
    }

    private function deleteImage(string $path): void
    {
        $cleanPath = trim($path);

        if (!$cleanPath) {
            return;
        }

        $cleanPath = str_replace('\\', '/', $cleanPath);
        $cleanPath = preg_replace('#^/storage/#', '', $cleanPath);
        $cleanPath = preg_replace('#^storage/#', '', $cleanPath);
        $cleanPath = preg_replace('#^public/#', '', $cleanPath);

        if ($cleanPath && Storage::disk('public')->exists($cleanPath)) {
            Storage::disk('public')->delete($cleanPath);
        }
    }

    private function keyColumn(): string
    {
        if (Schema::hasColumn('berita', 'id_berita')) {
            return 'id_berita';
        }

        return 'id';
    }

    private function statusColumn(): ?string
    {
        $candidates = [
            'status',
            'is_active',
            'isActive',
            'active',
            'published',
            'status_berita',
        ];

        foreach ($candidates as $column) {
            if (Schema::hasColumn('berita', $column)) {
                return $column;
            }
        }

        return null;
    }

    private function databaseStatusValue(string $column, string $status): string|int|bool
    {
        try {
            $type = strtolower((string) Schema::getColumnType('berita', $column));

            if (in_array($type, ['boolean', 'bool', 'tinyint', 'smallint', 'integer', 'int', 'bigint'], true)) {
                return $status === 'aktif' ? 1 : 0;
            }
        } catch (\Throwable) {
            // Fallback berdasarkan nama kolom untuk kompatibilitas schema lama.
        }

        if (in_array($column, ['is_active', 'isActive', 'active', 'published'], true)) {
            return $status === 'aktif' ? 1 : 0;
        }

        return $status;
    }

    private function imageColumn(): ?string
    {
        $candidates = [
            'gambar',
            'thumbnail',
            'foto',
            'image',
            'image_path',
            'path_gambar',
            'gambar_berita',
        ];

        foreach ($candidates as $column) {
            if (Schema::hasColumn('berita', $column)) {
                return $column;
            }
        }

        return null;
    }

    private function redirectToKelolaBerita(string $message): RedirectResponse
    {
        return redirect()
            ->to('/admin/kelola-berita')
            ->with([
                'success' => $message,
                'activeMenu' => 'kelola-berita',
            ]);
    }
}