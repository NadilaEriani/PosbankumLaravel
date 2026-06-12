<?php

namespace App\Http\Controllers\Paralegal;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LaporanPelayananController extends Controller
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

    private function digitsOnly(mixed $value): string
    {
        return preg_replace('/\D+/', '', (string) ($value ?? ''));
    }

    private function authUserId(Request $request): mixed
    {
        $user = $request->user();

        return $user->id_user ?? $user->id ?? $user?->getKey() ?? null;
    }

    private function normalizePriorityForDatabase(mixed $value): string
    {
        $raw = strtolower(trim((string) $value));

        if (str_contains($raw, 'sangat')) {
            return 'Sangat Tinggi';
        }

        if (str_contains($raw, 'tinggi') || $raw === 'high') {
            return 'Tinggi';
        }

        if (str_contains($raw, 'rendah') || $raw === 'low') {
            return 'Rendah';
        }

        if (str_contains($raw, 'sedang') || str_contains($raw, 'menengah') || $raw === 'medium') {
            return 'Menengah';
        }

        return 'Normal';
    }

    private function makePengaduanPrimaryKey(array &$payload): ?string
    {
        foreach (['id_pengaduan', 'uuid'] as $column) {
            if ($this->hasColumn('pengaduan', $column) && empty($payload[$column])) {
                $payload[$column] = (string) Str::uuid();
                return $payload[$column];
            }
        }

        return null;
    }

    private function makeLampiranPrimaryKey(array &$payload, string $table): void
    {
        foreach (['id_lampiran', 'uuid'] as $column) {
            if ($this->hasColumn($table, $column) && empty($payload[$column])) {
                $payload[$column] = (string) Str::uuid();
                return;
            }
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

    private function pengaduanKeyColumn(): string
    {
        return $this->hasColumn('pengaduan', 'id_pengaduan') ? 'id_pengaduan' : 'id';
    }

    private function generateNomorPengaduan(mixed $idPosbankum): string
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        $prefix = "PBKT/{$year}/{$month}/";
        $nextNumber = 1;

        if ($this->hasColumn('pengaduan', 'nomor_pengaduan')) {
            $query = DB::table('pengaduan')->where('nomor_pengaduan', 'like', $prefix . '%');

            if ($idPosbankum && $this->hasColumn('pengaduan', 'id_posbankum')) {
                $query->where('id_posbankum', $idPosbankum);
            }

            $last = $query->orderByDesc('nomor_pengaduan')->value('nomor_pengaduan');

            if ($last && preg_match('/(\d+)$/', (string) $last, $matches)) {
                $nextNumber = ((int) $matches[1]) + 1;
            }
        }

        return $prefix . str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT);
    }

    private function buildCatatanAdmin(Request $request, string $status = 'diproses', array $old = []): string
    {
        $updates = $old['updates'] ?? [];
        if (!is_array($updates)) {
            $updates = [];
        }

        $updates[] = [
            'title' => $status === 'selesai' ? 'Laporan Selesai' : 'Laporan Diterima',
            'date' => now()->locale('id')->translatedFormat('j F Y'),
            'time' => now()->format('H:i'),
            'desc' => $status === 'selesai'
                ? 'Laporan ditandai selesai oleh Posbankum.'
                : 'Laporan berhasil dibuat dan masuk ke antrian pemeriksaan awal.',
            'by' => $request->user()->nama_lengkap ?? $request->user()->name ?? 'Admin Posbankum',
        ];

        return json_encode([
            'nik' => $this->digitsOnly($request->input('nik')),
            'nama_lurah' => $request->input('nama_lurah'),
            'prioritas' => $request->input('prioritas', $old['prioritas'] ?? 'sedang'),
            'id_paralegal' => $request->input('id_paralegal', $old['id_paralegal'] ?? ''),
            'paralegal_nama' => $request->input('paralegal_nama', $old['paralegal_nama'] ?? ''),
            'paralegal_hp' => $request->input('paralegal_hp', $old['paralegal_hp'] ?? ''),
            'catatan_internal' => $request->input('catatan_internal', $old['catatan_internal'] ?? ''),
            'updates' => $updates,
        ], JSON_UNESCAPED_UNICODE);
    }

    private function parseCatatanAdmin(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode((string) $value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function lampiranTable(): ?string
    {
        foreach (['pengaduan_lampiran', 'lampiran_pengaduan', 'lampiran_pengaduans', 'lampiran'] as $table) {
            if ($this->hasTable($table)) {
                return $table;
            }
        }

        return null;
    }

    private function storeLampiran(Request $request, mixed $idPengaduan): void
    {
        $table = $this->lampiranTable();

        if (!$table || !$request->hasFile('lampiran')) {
            return;
        }

        $foreignKey = $this->firstExistingColumn($table, ['id_pengaduan', 'pengaduan_id']);
        if (!$foreignKey) {
            return;
        }

        foreach ($request->file('lampiran', []) as $file) {
            if (!$file || !$file->isValid()) {
                continue;
            }

            $safeName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
            $extension = strtolower($file->getClientOriginalExtension() ?: 'bin');
            $filename = now()->format('YmdHis') . '-' . Str::random(10) . '-' . ($safeName ?: 'lampiran') . '.' . $extension;
            $path = $file->storeAs('laporan-pelayanan/' . $idPengaduan, $filename, 'public');

            $payload = [];
            $this->makeLampiranPrimaryKey($payload, $table);
            $this->addColumn($payload, $table, $foreignKey, $idPengaduan);
            $this->addColumn($payload, $table, 'created_by', $this->authUserId($request));
            $this->addColumn($payload, $table, 'nama_file', $file->getClientOriginalName());
            $this->addColumn($payload, $table, 'file_name', $file->getClientOriginalName());
            $this->addColumn($payload, $table, 'path_file', $path);
            $this->addColumn($payload, $table, 'path', $path);
            $this->addColumn($payload, $table, 'file_path', $path);
            $this->addColumn($payload, $table, 'mime_type', $file->getClientMimeType());
            $this->addColumn($payload, $table, 'size_bytes', $file->getSize());
            $this->addColumn($payload, $table, 'created_at', now());
            $this->addColumn($payload, $table, 'updated_at', now());

            if (!empty($payload)) {
                DB::table($table)->insert($payload);
            }
        }
    }

    private function deleteLampiran(mixed $idPengaduan): void
    {
        $table = $this->lampiranTable();

        if (!$table) {
            return;
        }

        $foreignKey = $this->firstExistingColumn($table, ['id_pengaduan', 'pengaduan_id']);
        if (!$foreignKey) {
            return;
        }

        $rows = DB::table($table)->where($foreignKey, $idPengaduan)->get();

        foreach ($rows as $row) {
            $path = (string) $this->rowValue($row, ['path_file', 'path', 'file_path'], '');
            $clean = preg_replace('#^/?storage/#', '', str_replace('\\', '/', $path));

            if ($clean && !preg_match('/^https?:\/\//i', $clean) && Storage::disk('public')->exists($clean)) {
                Storage::disk('public')->delete($clean);
            }
        }

        DB::table($table)->where($foreignKey, $idPengaduan)->delete();
    }

    public function store(Request $request): RedirectResponse
    {
        if (!$this->hasTable('pengaduan')) {
            throw ValidationException::withMessages([
                'database' => 'Tabel pengaduan belum tersedia.',
            ]);
        }

        $validated = $request->validate([
            'nama_pelapor' => ['required', 'string', 'max:255'],
            'nik' => ['required', 'digits:16'],
            'nomor_telepon' => ['required', 'digits_between:10,15'],
            'nama_lurah' => ['required', 'string', 'max:255'],
            'jenis_masalah' => ['required', 'string', 'max:120'],
            'prioritas' => ['required', 'in:tinggi,sedang,rendah'],
            'judul_pengaduan' => ['required', 'string', 'max:100'],
            'kronologi' => ['required', 'string'],
            'tanggal_kejadian' => ['required', 'date'],
            'waktu_kejadian' => ['required', 'date_format:H:i'],
            'lokasi_kejadian' => ['required', 'string', 'max:255'],
            'id_paralegal' => ['required', 'string', 'max:100'],
            'masyarakat_id' => ['nullable', 'string', 'max:100'],
            'paralegal_nama' => ['nullable', 'string', 'max:255'],
            'paralegal_hp' => ['nullable', 'string', 'max:30'],
            'catatan_internal' => ['nullable', 'string'],
            'lampiran' => ['nullable', 'array'],
            'lampiran.*' => ['file', 'mimes:png,jpg,jpeg,pdf', 'max:5120'],
        ], [
            'nama_pelapor.required' => 'Nama lengkap pelapor wajib diisi.',
            'nik.required' => 'NIK wajib diisi.',
            'nik.digits' => 'NIK harus berisi 16 digit angka.',
            'nomor_telepon.required' => 'Nomor telepon wajib diisi.',
            'nomor_telepon.digits_between' => 'Nomor telepon harus 10 sampai 15 digit.',
            'jenis_masalah.required' => 'Jenis masalah wajib dipilih.',
            'prioritas.required' => 'Prioritas wajib dipilih.',
            'judul_pengaduan.required' => 'Judul laporan wajib diisi.',
            'kronologi.required' => 'Kronologi wajib diisi.',
            'tanggal_kejadian.required' => 'Tanggal kejadian wajib diisi.',
            'waktu_kejadian.required' => 'Waktu kejadian wajib diisi.',
            'lokasi_kejadian.required' => 'Lokasi kejadian wajib diisi.',
            'id_paralegal.required' => 'Paralegal wajib dipilih.',
            'lampiran.*.mimes' => 'Lampiran harus PNG, JPG, JPEG, atau PDF.',
            'lampiran.*.max' => 'Ukuran lampiran maksimal 5MB.',
        ]);

        $idPosbankum = $this->resolveUserPosbankumId($request->user());
        $createdBy = $this->authUserId($request);

        if (!$idPosbankum) {
            throw ValidationException::withMessages([
                'id_posbankum' => 'Akun ini belum terhubung dengan data Posbankum.',
            ]);
        }

        if (!$createdBy) {
            throw ValidationException::withMessages([
                'created_by' => 'Sesi pengguna tidak valid. Silakan login ulang.',
            ]);
        }

        $payload = [];
        $idPengaduan = $this->makePengaduanPrimaryKey($payload);
        $this->addColumn($payload, 'pengaduan', 'id_posbankum', $idPosbankum);
        $this->addColumn($payload, 'pengaduan', 'id_paralegal', $validated['id_paralegal']);
        $this->addColumn($payload, 'pengaduan', 'created_by', $createdBy);
        $this->addColumn($payload, 'pengaduan', 'masyarakat_id', $this->blankToNull($validated['masyarakat_id'] ?? null));
        $this->addColumn($payload, 'pengaduan', 'nomor_pengaduan', $this->generateNomorPengaduan($idPosbankum));
        $this->addColumn($payload, 'pengaduan', 'nama_pelapor', $validated['nama_pelapor']);
        $this->addColumn($payload, 'pengaduan', 'nik', $this->digitsOnly($validated['nik']));
        $this->addColumn($payload, 'pengaduan', 'nomor_telepon', $this->digitsOnly($validated['nomor_telepon']));
        $this->addColumn($payload, 'pengaduan', 'jenis_masalah', $validated['jenis_masalah']);
        $this->addColumn($payload, 'pengaduan', 'kategori_masalah', $validated['jenis_masalah']);
        $this->addColumn($payload, 'pengaduan', 'judul_pengaduan', $validated['judul_pengaduan']);
        $this->addColumn($payload, 'pengaduan', 'judul_laporan', $validated['judul_pengaduan']);
        $this->addColumn($payload, 'pengaduan', 'kronologi', $validated['kronologi']);
        $this->addColumn($payload, 'pengaduan', 'tanggal_kejadian', $validated['tanggal_kejadian']);
        $this->addColumn($payload, 'pengaduan', 'tgl_kejadian', $validated['tanggal_kejadian']);
        $this->addColumn($payload, 'pengaduan', 'waktu_kejadian', $validated['waktu_kejadian']);
        $this->addColumn($payload, 'pengaduan', 'lokasi_kejadian', $validated['lokasi_kejadian']);
        $this->addColumn($payload, 'pengaduan', 'lokasi', $validated['lokasi_kejadian']);
        $this->addColumn($payload, 'pengaduan', 'status', 'diproses');
        $this->addColumn($payload, 'pengaduan', 'prioritas', $this->normalizePriorityForDatabase($validated['prioritas']));
        $this->addColumn($payload, 'pengaduan', 'catatan_internal', $this->blankToNull($validated['catatan_internal'] ?? null));
        $this->addColumn($payload, 'pengaduan', 'catatan_admin', $this->buildCatatanAdmin($request));
        $this->addColumn($payload, 'pengaduan', 'created_at', now());
        $this->addColumn($payload, 'pengaduan', 'updated_at', now());

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'database' => 'Tidak ada kolom pengaduan yang dapat diisi.',
            ]);
        }

        DB::transaction(function () use ($request, $payload, &$idPengaduan) {
            if ($idPengaduan) {
                DB::table('pengaduan')->insert($payload);
            } else {
                $idColumn = $this->pengaduanKeyColumn();
                $idPengaduan = DB::table('pengaduan')->insertGetId($payload, $idColumn);
            }

            $this->storeLampiran($request, $idPengaduan);
        });

        return redirect()->back()->with('success', 'Laporan berhasil disimpan.');
    }

    public function updateStatus(Request $request, mixed $id): RedirectResponse
    {
        if (!$this->hasTable('pengaduan')) {
            abort(404);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:diproses,selesai'],
        ]);

        $idColumn = $this->pengaduanKeyColumn();
        $row = DB::table('pengaduan')->where($idColumn, $id)->first();

        if (!$row) {
            abort(404);
        }

        $oldCatatan = $this->parseCatatanAdmin($this->rowValue($row, ['catatan_admin'], '{}'));
        $request->merge([
            'prioritas' => $oldCatatan['prioritas'] ?? $this->rowValue($row, ['prioritas'], 'sedang'),
            'id_paralegal' => $oldCatatan['id_paralegal'] ?? $this->rowValue($row, ['id_paralegal'], ''),
            'paralegal_nama' => $oldCatatan['paralegal_nama'] ?? '',
            'paralegal_hp' => $oldCatatan['paralegal_hp'] ?? '',
            'catatan_internal' => $oldCatatan['catatan_internal'] ?? '',
            'nik' => $oldCatatan['nik'] ?? '',
            'nama_lurah' => $oldCatatan['nama_lurah'] ?? '',
        ]);

        $payload = [];
        $this->addColumn($payload, 'pengaduan', 'status', $validated['status']);
        $this->addColumn($payload, 'pengaduan', 'catatan_admin', $this->buildCatatanAdmin($request, $validated['status'], $oldCatatan));
        $this->addColumn($payload, 'pengaduan', 'updated_at', now());

        if ($validated['status'] === 'selesai') {
            $this->addColumn($payload, 'pengaduan', 'tgl_selesai', Carbon::now()->toDateString());
            $this->addColumn($payload, 'pengaduan', 'tanggal_selesai', Carbon::now()->toDateString());
        }

        DB::table('pengaduan')->where($idColumn, $id)->update($payload);

        return redirect()->back()->with('success', 'Status laporan berhasil diperbarui.');
    }

    public function destroy(mixed $id): RedirectResponse
    {
        if (!$this->hasTable('pengaduan')) {
            abort(404);
        }

        $idColumn = $this->pengaduanKeyColumn();
        $row = DB::table('pengaduan')->where($idColumn, $id)->first();

        if (!$row) {
            abort(404);
        }

        $this->deleteLampiran($id);
        DB::table('pengaduan')->where($idColumn, $id)->delete();

        return redirect()->back()->with('success', 'Laporan berhasil dihapus.');
    }
}
