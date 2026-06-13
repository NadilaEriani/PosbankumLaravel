<?php

namespace App\Http\Controllers\Paralegal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function hasColumn(string $table, string $column): bool
    {
        return $this->hasTable($table) && Schema::hasColumn($table, $column);
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

    private function firstExistingColumn(string $table, array $columns): ?string
    {
        foreach ($columns as $column) {
            if ($this->hasColumn($table, $column)) {
                return $column;
            }
        }

        return null;
    }

    private function normalizeStorageUrl(?string $path): string
    {
        $clean = trim((string) $path);

        if ($clean === '') {
            return '';
        }

        if (preg_match('/^(https?:|data:|blob:)/i', $clean)) {
            return $clean;
        }

        $clean = str_replace('\\', '/', $clean);
        $clean = preg_replace('#^/storage/#', '', $clean);
        $clean = preg_replace('#^storage/#', '', $clean);
        $clean = preg_replace('#^public/#', '', $clean);
        $clean = preg_replace('#^app/public/#', '', $clean);
        $clean = ltrim($clean, '/');

        return $clean !== '' ? '/file-preview?path=' . rawurlencode($clean) : '';
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

    private function getPosbankumId(array|object $row): mixed
    {
        return $this->rowValue($row, ['id_posbankum', 'posbankum_id', 'id']);
    }

    private function getPosbankumName(array|object $row, int $index = 0): string
    {
        return (string) $this->rowValue($row, ['nama', 'nama_posbankum', 'name'], 'Posbankum ' . ($index + 1));
    }

    private function getPosbankumAddress(array|object $row): string
    {
        return (string) $this->rowValue($row, ['alamat', 'address', 'lokasi'], 'Alamat belum tersedia');
    }

    private function getPosbankumPhone(array|object $row): string
    {
        return (string) $this->rowValue($row, ['nomor_tlp', 'nomor_telepon', 'phone', 'telp'], '-');
    }

    private function getPosbankumEmail(array|object $row): string
    {
        return (string) $this->rowValue($row, ['email_akun', 'email', 'email_posbankum'], '-');
    }

    private function posbankumById(mixed $id): array
    {
        if (!$id || !$this->hasTable('posbankum')) {
            return [];
        }

        $idColumn = $this->hasColumn('posbankum', 'id_posbankum') ? 'id_posbankum' : 'id';
        $row = DB::table('posbankum')->where($idColumn, $id)->first();

        if (!$row) {
            return [];
        }

        return [
            'id' => $this->getPosbankumId($row),
            'id_posbankum' => $this->getPosbankumId($row),
            'nama' => $this->getPosbankumName($row),
            'alamat' => $this->getPosbankumAddress($row),
            'email_akun' => $this->getPosbankumEmail($row),
            'nomor_tlp' => $this->getPosbankumPhone($row),
            'jml_paralegal' => (int) $this->rowValue($row, ['jml_paralegal', 'jumlah_paralegal'], 0),
            'latitude' => $this->rowValue($row, ['latitude', 'lat', 'latitude_pos', 'lat_pos', 'lattitude']),
            'longitude' => $this->rowValue($row, ['longitude', 'lng', 'long', 'longitude_pos', 'lng_pos', 'long_pos']),
            'status_lokasi' => (string) $this->rowValue($row, ['status_lokasi', 'status_tagging', 'status_verifikasi_lokasi', 'status_verifikasi_tagging'], ''),
        ];
    }

    private function casesThisMonthCount(mixed $idPosbankum = null): int
    {
        if (!$this->hasTable('pengaduan')) {
            return 0;
        }

        $query = DB::table('pengaduan');

        if ($idPosbankum && $this->hasColumn('pengaduan', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        if ($this->hasColumn('pengaduan', 'created_at')) {
            $query->whereBetween('created_at', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()]);
        }

        return $query->count();
    }

    private function completedActivitiesCount(mixed $idPosbankum = null): int
    {
        if (!$this->hasTable('kegiatan')) {
            return 0;
        }

        $query = DB::table('kegiatan');

        if ($idPosbankum && $this->hasColumn('kegiatan', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        if ($this->hasColumn('kegiatan', 'status')) {
            $query->whereIn('status', ['selesai', 'diterima', 'Selesai', 'Diterima', 'completed', 'done']);
        }

        return $query->count();
    }

    private function paralegalCount(mixed $idPosbankum, array $posbankum): int
    {
        if ($idPosbankum && $this->hasColumn('posbankum_paralegal', 'id_posbankum')) {
            $query = DB::table('posbankum_paralegal')->where('id_posbankum', $idPosbankum);

            if ($this->hasColumn('posbankum_paralegal', 'status')) {
                $query->where('status', 'aktif');
            }

            return $query->count();
        }

        if ($idPosbankum && $this->hasColumn('paralegal_members', 'id_posbankum')) {
            return DB::table('paralegal_members')->where('id_posbankum', $idPosbankum)->count();
        }

        if ($idPosbankum && $this->hasColumn('users', 'id_posbankum')) {
            $query = DB::table('users')->where('id_posbankum', $idPosbankum);

            if ($this->hasColumn('users', 'role')) {
                $query->whereIn('role', ['paralegal', 'posbankum']);
            }

            return $query->count();
        }

        return (int) ($posbankum['jml_paralegal'] ?? 0);
    }

    private function latestPengaduan(mixed $idPosbankum = null): array
    {
        if (!$this->hasTable('pengaduan')) {
            return [];
        }

        $query = DB::table('pengaduan');

        if ($idPosbankum && $this->hasColumn('pengaduan', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        foreach (['created_at', 'tgl_lapor', 'tanggal_kejadian'] as $orderColumn) {
            if ($this->hasColumn('pengaduan', $orderColumn)) {
                $query->orderByDesc($orderColumn);
                break;
            }
        }

        return $query->limit(6)->get()->map(function ($row, $index) {
            $catatan = $this->parseJson($this->rowValue($row, ['catatan_admin'], '{}'));

            return [
                'id' => $this->rowValue($row, ['id_pengaduan', 'id'], $index + 1),
                'title' => (string) $this->rowValue($row, ['judul_pengaduan', 'judul_laporan', 'judul', 'kategori_masalah', 'jenis_masalah'], 'Pengaduan #' . ($index + 1)),
                'description' => (string) $this->rowValue($row, ['kronologi', 'deskripsi', 'uraian', 'isi_pengaduan'], 'Belum ada deskripsi.'),
                'status' => (string) $this->rowValue($row, ['status'], 'Dalam Proses'),
                'location' => (string) $this->rowValue($row, ['lokasi_kejadian', 'lokasi', 'alamat'], 'Posbankum'),
                'kategori' => (string) $this->rowValue($row, ['jenis_masalah', 'kategori_masalah'], $catatan['jenis_masalah'] ?? 'Kasus'),
                'date' => $this->rowValue($row, ['created_at', 'updated_at', 'tanggal_kejadian', 'tgl_lapor'], now()->toISOString()),
            ];
        })->toArray();
    }

    private function latestKegiatan(mixed $idPosbankum = null): array
    {
        if (!$this->hasTable('kegiatan')) {
            return [];
        }

        $query = DB::table('kegiatan');

        if ($idPosbankum && $this->hasColumn('kegiatan', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        foreach (['created_at', 'tgl_upload', 'tgl_mulai', 'tanggal'] as $orderColumn) {
            if ($this->hasColumn('kegiatan', $orderColumn)) {
                $query->orderByDesc($orderColumn);
                break;
            }
        }

        return $query->limit(6)->get()->map(function ($row, $index) {
            return [
                'id' => $this->rowValue($row, ['id_kegiatan', 'id'], $index + 1),
                'title' => (string) $this->rowValue($row, ['nama_kegiatan', 'judul', 'tema'], 'Kegiatan #' . ($index + 1)),
                'description' => (string) $this->rowValue($row, ['deskripsi', 'catatan', 'lokasi'], 'Belum ada deskripsi kegiatan.'),
                'status' => (string) $this->rowValue($row, ['status'], 'Diproses'),
                'date' => $this->rowValue($row, ['tanggal_kegiatan', 'tgl_mulai', 'tgl_upload', 'tanggal', 'created_at'], now()->toISOString()),
                'lokasi' => (string) $this->rowValue($row, ['lokasi', 'tempat'], ''),
                'peserta' => $this->rowValue($row, ['jumlah_peserta', 'peserta'], ''),
            ];
        })->toArray();
    }

    private function normalizeStorageUrlForKegiatan(?string $path): string
    {
        return $this->normalizeStorageUrl($path);
    }

    private function kegiatanRows(mixed $idPosbankum = null): array
    {
        if (!$this->hasTable('kegiatan')) {
            return [];
        }

        $query = DB::table('kegiatan');

        if ($idPosbankum && $this->hasColumn('kegiatan', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        foreach (['created_at', 'tgl_upload', 'tgl_mulai', 'tanggal_kegiatan', 'tanggal'] as $orderColumn) {
            if ($this->hasColumn('kegiatan', $orderColumn)) {
                $query->orderByDesc($orderColumn);
                break;
            }
        }

        return $query->limit(300)->get()->values()->map(function ($row, $index) {
            $thumbnailPath = (string) $this->rowValue($row, ['thumbnail_path', 'gambar', 'image'], '');

            $data = (array) $row;

            return array_merge($data, [
                'id' => $this->rowValue($row, ['id_kegiatan', 'id'], $index + 1),
                'id_kegiatan' => $this->rowValue($row, ['id_kegiatan', 'id'], $index + 1),
                'id_posbankum' => $this->rowValue($row, ['id_posbankum']),
                'judul' => (string) $this->rowValue($row, ['judul', 'nama_kegiatan', 'tema'], 'Kegiatan #' . ($index + 1)),
                'deskripsi' => (string) $this->rowValue($row, ['deskripsi', 'catatan', 'keterangan'], ''),
                'status' => (string) $this->rowValue($row, ['status'], 'Diproses'),
                'tgl_upload' => $this->rowValue($row, ['tgl_upload', 'created_at', 'updated_at']),
                'tgl_mulai' => $this->rowValue($row, ['tgl_mulai', 'tanggal_kegiatan', 'tanggal', 'created_at']),
                'tgl_selesai' => $this->rowValue($row, ['tgl_selesai']),
                'thumbnail_path' => $thumbnailPath,
                'thumbnail_url' => $this->normalizeStorageUrlForKegiatan($thumbnailPath),
                'lokasi' => (string) $this->rowValue($row, ['lokasi', 'tempat', 'alamat', 'location'], ''),
                'jumlah_peserta' => $this->rowValue($row, ['jumlah_peserta', 'target_peserta', 'peserta']),
                'hasil_kegiatan' => (string) $this->rowValue($row, ['hasil_kegiatan'], ''),
                'anggota_terlibat' => $this->rowValue($row, ['anggota_terlibat', 'anggota', 'peserta_terlibat', 'tim_terlibat'], ''),
                'catatan' => (string) $this->rowValue($row, ['catatan', 'catatan_admin', 'note', 'keterangan'], ''),
            ]);
        })->toArray();
    }


    private function notifications(mixed $idPosbankum = null): array
    {
        if (!$this->hasTable('notifikasi')) {
            return [];
        }

        $query = DB::table('notifikasi');

        if ($idPosbankum && $this->hasColumn('notifikasi', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        if ($this->hasColumn('notifikasi', 'created_at')) {
            $query->orderByDesc('created_at');
        }

        return $query->limit(20)->get()->map(function ($row, $index) {
            return [
                'id' => $this->rowValue($row, ['id_notifikasi', 'id'], $index + 1),
                'id_notifikasi' => $this->rowValue($row, ['id_notifikasi', 'id'], $index + 1),
                'title' => (string) $this->rowValue($row, ['judul', 'title'], 'Notifikasi'),
                'judul' => (string) $this->rowValue($row, ['judul', 'title'], 'Notifikasi'),
                'message' => (string) $this->rowValue($row, ['pesan', 'message', 'deskripsi'], 'Tidak ada pesan.'),
                'pesan' => (string) $this->rowValue($row, ['pesan', 'message', 'deskripsi'], 'Tidak ada pesan.'),
                'kategori' => (string) $this->rowValue($row, ['kategori', 'type'], 'sistem'),
                'prioritas' => (string) $this->rowValue($row, ['prioritas', 'priority'], 'sedang'),
                'is_read' => (bool) $this->rowValue($row, ['is_read', 'dibaca'], false),
                'created_at' => $this->rowValue($row, ['created_at', 'tanggal'], now()->toISOString()),
            ];
        })->toArray();
    }

    private function parseJson(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_object($value)) {
            return (array) $value;
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
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

    private function lampiranRows(array $pengaduanIds): array
    {
        $table = $this->lampiranTable();

        if (!$table || empty($pengaduanIds)) {
            return [];
        }

        $foreignKey = $this->firstExistingColumn($table, ['id_pengaduan', 'pengaduan_id']);
        if (!$foreignKey) {
            return [];
        }

        $rows = DB::table($table)->whereIn($foreignKey, $pengaduanIds)->get();

        return $rows->groupBy($foreignKey)->map(function ($items) {
            return $items->values()->map(function ($row, $index) {
                $path = (string) $this->rowValue($row, ['path_file', 'path', 'file_path', 'url', 'public_url'], '');
                $name = (string) $this->rowValue($row, ['nama_file', 'name', 'file_name'], basename($path) ?: 'Lampiran');

                return [
                    'id_lampiran' => $this->rowValue($row, ['id_lampiran', 'id'], $index + 1),
                    'nama_file' => $name,
                    'path_file' => $path,
                    'url' => $this->normalizeStorageUrl($path),
                    'public_url' => $this->normalizeStorageUrl($path),
                    'mime_type' => (string) $this->rowValue($row, ['mime_type', 'mime'], ''),
                    'size_bytes' => (int) $this->rowValue($row, ['size_bytes', 'size', 'file_size'], 0),
                ];
            })->toArray();
        })->toArray();
    }

    private function laporanPelayananRows(mixed $idPosbankum = null): array
    {
        if (!$this->hasTable('pengaduan')) {
            return [];
        }

        $query = DB::table('pengaduan');

        if ($idPosbankum && $this->hasColumn('pengaduan', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        foreach (['created_at', 'tgl_lapor', 'tanggal_kejadian'] as $orderColumn) {
            if ($this->hasColumn('pengaduan', $orderColumn)) {
                $query->orderByDesc($orderColumn);
                break;
            }
        }

        $rows = $query->limit(300)->get();
        $ids = $rows->map(fn($row) => $this->rowValue($row, ['id_pengaduan', 'id']))->filter()->values()->all();
        $lampiranMap = $this->lampiranRows($ids);

        return $rows->values()->map(function ($row, $index) use ($lampiranMap) {
            $id = $this->rowValue($row, ['id_pengaduan', 'id'], $index + 1);
            $extra = $this->parseJson($this->rowValue($row, ['catatan_admin'], '{}'));
            $updates = $extra['updates'] ?? [];

            return [
                'id_pengaduan' => $id,
                'id_posbankum' => $this->rowValue($row, ['id_posbankum']),
                'id_paralegal' => $this->rowValue($row, ['id_paralegal'], $extra['id_paralegal'] ?? ''),
                'nomor_pengaduan' => (string) $this->rowValue($row, ['nomor_pengaduan'], 'PBKT/' . date('Y') . '/' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT)),
                'nama_pelapor' => (string) $this->rowValue($row, ['nama_pelapor'], '-'),
                'nik' => (string) ($extra['nik'] ?? $this->rowValue($row, ['nik'], '')),
                'nomor_telepon' => (string) $this->rowValue($row, ['nomor_telepon', 'no_hp_pelapor', 'telepon'], '-'),
                'nama_lurah' => (string) ($extra['nama_lurah'] ?? $this->rowValue($row, ['nama_lurah'], '-')),
                'jenis_masalah' => (string) $this->rowValue($row, ['jenis_masalah', 'kategori_masalah'], 'Lainnya'),
                'judul_pengaduan' => (string) $this->rowValue($row, ['judul_pengaduan', 'judul_laporan', 'judul'], 'Laporan Pelayanan'),
                'kronologi' => (string) $this->rowValue($row, ['kronologi', 'deskripsi', 'uraian'], 'Belum ada kronologi.'),
                'tanggal_kejadian' => $this->rowValue($row, ['tanggal_kejadian', 'tgl_kejadian', 'tgl_lapor', 'created_at']),
                'waktu_kejadian' => (string) $this->rowValue($row, ['waktu_kejadian'], ''),
                'lokasi_kejadian' => (string) $this->rowValue($row, ['lokasi_kejadian', 'lokasi', 'alamat'], '-'),
                'status' => (string) $this->rowValue($row, ['status'], 'diproses'),
                'prioritas' => (string) ($extra['prioritas'] ?? $this->rowValue($row, ['prioritas'], 'sedang')),
                'created_at' => $this->rowValue($row, ['created_at', 'tgl_lapor']),
                'paralegal_nama' => (string) ($extra['paralegal_nama'] ?? $this->rowValue($row, ['nama_paralegal_ditugaskan', 'paralegal_nama'], 'Paralegal')),
                'paralegal_hp' => (string) ($extra['paralegal_hp'] ?? $this->rowValue($row, ['no_hp_paralegal', 'paralegal_hp'], '')),
                'catatan_internal' => (string) ($extra['catatan_internal'] ?? ''),
                'lampiran' => $lampiranMap[$id] ?? [],
                'updates' => is_array($updates) ? $updates : [],
            ];
        })->toArray();
    }

    private function paralegalOptions(mixed $idPosbankum = null): array
    {
        if ($this->hasTable('posbankum_paralegal') && $this->hasTable('users')) {
            $query = DB::table('posbankum_paralegal as pp')
                ->join('users as u', 'u.id_user', '=', 'pp.id_user');

            if ($idPosbankum && $this->hasColumn('posbankum_paralegal', 'id_posbankum')) {
                $query->where('pp.id_posbankum', $idPosbankum);
            }

            if ($this->hasColumn('posbankum_paralegal', 'status')) {
                $query->where('pp.status', 'aktif');
            }

            if ($this->hasColumn('users', 'role')) {
                $query->where('u.role', 'paralegal');
            }

            return $query
                ->select('u.id_user', 'u.nama_lengkap', 'u.name', 'u.email', 'u.nomor_telepon')
                ->limit(200)
                ->get()
                ->values()
                ->map(function ($row, $index) {
                    $id = $this->rowValue($row, ['id_user'], 'user-' . ($index + 1));
                    $nama = (string) $this->rowValue($row, ['nama_lengkap', 'name', 'email'], 'Paralegal');
                    $hp = (string) $this->rowValue($row, ['nomor_telepon', 'phone', 'telp'], '');

                    return [
                        'id' => $id,
                        'id_paralegal' => $id,
                        'nama' => $nama,
                        'nama_paralegal' => $nama,
                        'hp' => $hp,
                        'nomor_telepon' => $hp,
                    ];
                })
                ->toArray();
        }

        if ($this->hasTable('paralegal_members')) {
            $query = DB::table('paralegal_members');

            if ($idPosbankum && $this->hasColumn('paralegal_members', 'id_posbankum')) {
                $query->where('id_posbankum', $idPosbankum);
            }

            return $query->limit(200)->get()->values()->map(function ($row, $index) {
                $id = $this->rowValue($row, ['id_paralegal', 'id', 'id_user'], 'paralegal-' . ($index + 1));
                $nama = (string) $this->rowValue($row, ['nama_paralegal', 'nama', 'nama_lengkap', 'name'], 'Paralegal');
                $hp = (string) $this->rowValue($row, ['nomor_telepon', 'no_hp', 'hp', 'phone'], '');

                return [
                    'id' => $id,
                    'id_paralegal' => $id,
                    'nama' => $nama,
                    'nama_paralegal' => $nama,
                    'hp' => $hp,
                    'nomor_telepon' => $hp,
                ];
            })->toArray();
        }

        if ($this->hasTable('users')) {
            $query = DB::table('users');

            if ($this->hasColumn('users', 'role')) {
                $query->whereIn('role', ['paralegal', 'posbankum']);
            }

            if ($idPosbankum && $this->hasColumn('users', 'id_posbankum')) {
                $query->where('id_posbankum', $idPosbankum);
            }

            return $query->limit(200)->get()->values()->map(function ($row, $index) {
                $id = $this->rowValue($row, ['id_user', 'id'], 'user-' . ($index + 1));
                $nama = (string) $this->rowValue($row, ['nama_lengkap', 'name', 'nama'], 'Paralegal');
                $hp = (string) $this->rowValue($row, ['nomor_telepon', 'phone', 'telp'], '');

                return [
                    'id' => $id,
                    'id_paralegal' => $id,
                    'nama' => $nama,
                    'nama_paralegal' => $nama,
                    'hp' => $hp,
                    'nomor_telepon' => $hp,
                ];
            })->toArray();
        }

        return [];
    }


    private function parseCatatanForCase(mixed $value): array
    {
        return $this->parseJson($value);
    }

    private function normalizeCaseStatus(mixed $value): string
    {
        $raw = strtolower(trim((string) $value));

        if (in_array($raw, ['selesai', 'done', 'completed', 'complete', 'diterima', 'approved'], true)) {
            return 'Selesai';
        }

        if ($raw === 'mediasi' || $raw === 'mediation') {
            return 'Mediasi';
        }

        return 'Diproses';
    }

    private function normalizeCasePriority(mixed $value): string
    {
        $raw = strtolower(trim((string) $value));

        if ($raw === 'tinggi' || $raw === 'high') {
            return 'Tinggi';
        }

        if ($raw === 'rendah' || $raw === 'low') {
            return 'Rendah';
        }

        return 'Sedang';
    }

    private function normalizeCaseCategory(mixed $value): string
    {
        $raw = strtolower(trim((string) $value));

        if (str_contains($raw, 'pidana'))
            return 'Hukum Pidana';
        if (str_contains($raw, 'perdata'))
            return 'Hukum Perdata';
        if (str_contains($raw, 'keluarga'))
            return 'Hukum Keluarga';
        if (str_contains($raw, 'kerja') || str_contains($raw, 'ketenagakerjaan'))
            return 'Hukum Ketenagakerjaan';
        if (str_contains($raw, 'waris'))
            return 'Hukum Waris';
        if (str_contains($raw, 'tanah') || str_contains($raw, 'pertanahan'))
            return 'Pertanahan';

        return trim((string) $value) ?: 'Lainnya';
    }

    private function semuaKasusRows(): array
    {
        if (!$this->hasTable('pengaduan')) {
            return [];
        }

        $posbankumMap = collect();
        if ($this->hasTable('posbankum')) {
            $posbankumMap = DB::table('posbankum')->get()->keyBy(function ($row) {
                return (string) $this->rowValue($row, ['id_posbankum', 'id']);
            });
        }

        $query = DB::table('pengaduan');

        foreach (['created_at', 'tgl_lapor', 'tanggal_kejadian'] as $orderColumn) {
            if ($this->hasColumn('pengaduan', $orderColumn)) {
                $query->orderByDesc($orderColumn);
                break;
            }
        }

        return $query->limit(500)->get()->values()->map(function ($row, $index) use ($posbankumMap) {
            $extra = $this->parseCatatanForCase($this->rowValue($row, ['catatan_admin'], '{}'));
            $idPosbankum = $this->rowValue($row, ['id_posbankum']);
            $posRow = $idPosbankum ? $posbankumMap->get((string) $idPosbankum) : null;
            $status = $this->normalizeCaseStatus($this->rowValue($row, ['status'], $extra['status'] ?? 'Diproses'));
            $progress = $extra['progress'] ?? ($status === 'Selesai' ? 100 : ($status === 'Mediasi' ? 60 : 25));

            return [
                'id' => (string) $this->rowValue($row, ['nomor_pengaduan', 'id_pengaduan', 'id'], 'KASUS-' . ($index + 1)),
                'id_pengaduan' => $this->rowValue($row, ['id_pengaduan', 'id'], $index + 1),
                'judul' => (string) $this->rowValue($row, ['judul_pengaduan', 'judul_laporan', 'judul', 'jenis_masalah', 'kategori_masalah'], 'Tanpa Judul'),
                'kategori' => $this->normalizeCaseCategory($this->rowValue($row, ['jenis_masalah', 'kategori_masalah', 'kategori'], $extra['kategori'] ?? 'Lainnya')),
                'status' => $status,
                'prioritas' => $this->normalizeCasePriority($this->rowValue($row, ['prioritas'], $extra['prioritas'] ?? 'Sedang')),
                'progress' => max(0, min(100, (int) $progress)),
                'posbankum' => (string) $this->rowValue($posRow, ['nama', 'nama_posbankum'], 'Posbankum Belum Dipetakan'),
                'kota' => (string) $this->rowValue($row, ['lokasi_kejadian', 'lokasi', 'alamat', 'kabupaten_kota', 'kecamatan'], $this->rowValue($posRow, ['alamat'], '-')),
                'pelapor' => (string) $this->rowValue($row, ['nama_pelapor'], 'Pelapor Belum Diisi'),
                'paralegal' => (string) ($extra['paralegal_nama'] ?? $this->rowValue($row, ['nama_paralegal_ditugaskan', 'paralegal_nama'], $this->rowValue($posRow, ['nama_paralegal'], 'Paralegal Belum Diisi'))),
                'paralegalPhone' => (string) ($extra['paralegal_hp'] ?? $this->rowValue($row, ['no_hp_paralegal', 'paralegal_hp'], $this->rowValue($posRow, ['nomor_tlp'], '-'))),
                'emailPosbankum' => (string) $this->rowValue($posRow, ['email_akun', 'email'], $this->rowValue($row, ['email'], '-')),
                'tanggalLapor' => $this->rowValue($row, ['created_at', 'tgl_lapor', 'tanggal_kejadian'], now()->toISOString()),
                'updateTerakhir' => $this->rowValue($row, ['updated_at', 'created_at', 'tgl_lapor'], now()->toISOString()),
                'deskripsi' => (string) $this->rowValue($row, ['kronologi', 'deskripsi', 'uraian', 'isi_pengaduan'], $extra['catatan_internal'] ?? 'Belum ada deskripsi kasus.'),
                'sumberData' => 'Website',
            ];
        })->toArray();
    }

    private function posbankumDocumentRows(mixed $idPosbankum = null): array
    {
        if (!$idPosbankum || !$this->hasTable('data_posbankum')) {
            return [];
        }

        $query = DB::table('data_posbankum');

        if ($this->hasColumn('data_posbankum', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        foreach (['tgl_upload', 'created_at', 'updated_at'] as $orderColumn) {
            if ($this->hasColumn('data_posbankum', $orderColumn)) {
                $query->orderByDesc($orderColumn);
                break;
            }
        }

        return $query->limit(300)->get()->values()->map(function ($row, $index) {
            $path = (string) $this->rowValue($row, ['path_berkas', 'path_file', 'path', 'file_path'], '');

            return array_merge((array) $row, [
                'id' => $this->rowValue($row, ['id_data', 'id'], $index + 1),
                'id_data' => $this->rowValue($row, ['id_data', 'id'], $index + 1),
                'kategori' => (string) $this->rowValue($row, ['kategori', 'jenis_dokumen'], 'dokumen'),
                'path_berkas' => $path,
                'url' => $this->normalizeStorageUrl($path),
                'public_url' => $this->normalizeStorageUrl($path),
                'nama_berkas' => (string) $this->rowValue($row, ['nama_berkas', 'nama_file', 'file_name'], basename($path) ?: 'Dokumen'),
                'mime_type' => (string) $this->rowValue($row, ['mime_type', 'mime'], ''),
                'size_bytes' => (int) $this->rowValue($row, ['size_bytes', 'file_size', 'size'], 0),
                'status_verifikasi' => (string) $this->rowValue($row, ['status_verifikasi', 'status'], 'menunggu'),
                'catatan_admin' => (string) $this->rowValue($row, ['catatan_admin', 'catatan_penolakan', 'alasan_penolakan', 'catatan'], ''),
                'tgl_upload' => $this->rowValue($row, ['tgl_upload', 'created_at', 'updated_at'], now()->toISOString()),
            ]);
        })->toArray();
    }

    private function posbankumLocation(array $posbankum): array
    {
        return [
            'lat' => $posbankum['latitude'] ?? '',
            'lng' => $posbankum['longitude'] ?? '',
            'alamat' => $posbankum['alamat'] ?? '',
            'status' => $posbankum['status_lokasi'] ?? '',
        ];
    }


    private function currentUserId($user): ?string
    {
        if (!$user) {
            return null;
        }

        foreach (['id_user', 'id'] as $key) {
            if (!empty($user->{$key})) {
                return (string) $user->{$key};
            }
        }

        return null;
    }

    private function userKeyColumn(): string
    {
        return $this->hasColumn('users', 'id_user') ? 'id_user' : 'id';
    }

    private function paralegalProfilePayload($user, mixed $idPosbankum, array $posbankum): array
    {
        $userId = $this->currentUserId($user);

        return [
            'user' => [
                'id' => $userId,
                'id_user' => $userId,
                'name' => (string) ($user->nama_lengkap ?? $user->name ?? 'Paralegal'),
                'nama_lengkap' => (string) ($user->nama_lengkap ?? $user->name ?? 'Paralegal'),
                'email' => (string) ($user->email ?? ''),
                'nomor_telepon' => (string) ($user->nomor_telepon ?? $user->phone ?? ''),
                'phone' => (string) ($user->nomor_telepon ?? $user->phone ?? ''),
                'role' => (string) ($user->role ?? 'paralegal'),
                'status' => (string) ($user->status ?? 'aktif'),
            ],
            'posbankum' => $this->posbankumProfileInfo($idPosbankum, $posbankum),
            'team' => $this->paralegalTeamRows($idPosbankum, $userId, $user),
        ];
    }

    private function posbankumProfileInfo(mixed $idPosbankum, array $fallback): array
    {
        $info = $fallback;
        $row = null;

        if ($idPosbankum && $this->hasTable('posbankum')) {
            $idColumn = $this->hasColumn('posbankum', 'id_posbankum') ? 'id_posbankum' : 'id';
            $row = DB::table('posbankum')->where($idColumn, $idPosbankum)->first();

            if ($row) {
                $info = array_merge($info, [
                    'id' => $this->getPosbankumId($row),
                    'id_posbankum' => $this->getPosbankumId($row),
                    'nama' => $this->getPosbankumName($row),
                    'alamat' => $this->getPosbankumAddress($row),
                    'email_akun' => $this->getPosbankumEmail($row),
                    'nomor_tlp' => $this->getPosbankumPhone($row),
                    'kode_pos' => (string) $this->rowValue($row, ['kode_pos'], ''),
                    'latitude' => $this->rowValue($row, ['latitude', 'lat', 'latitude_pos', 'lat_pos', 'lattitude']),
                    'longitude' => $this->rowValue($row, ['longitude', 'lng', 'long', 'longitude_pos', 'lng_pos', 'long_pos']),
                    'status_tagging_area' => (string) $this->rowValue($row, ['status_verifikasi_tagging_area', 'status_lokasi', 'status_tagging'], ''),
                ]);
            }
        }

        $kelurahanId = $row ? $this->rowValue($row, ['id_kelurahan']) : null;
        $kelurahan = null;
        $kecamatan = null;
        $kabupaten = null;

        if ($kelurahanId && $this->hasTable('kelurahan')) {
            $kelurahan = DB::table('kelurahan')->where('id_kelurahan', $kelurahanId)->first();
        }

        if ($kelurahan && $this->hasTable('kecamatan')) {
            $idKecamatan = $this->rowValue($kelurahan, ['id_kecamatan']);
            if ($idKecamatan) {
                $kecamatan = DB::table('kecamatan')->where('id_kecamatan', $idKecamatan)->first();
            }
        }

        if ($kecamatan && $this->hasTable('kabupaten')) {
            $idKabupaten = $this->rowValue($kecamatan, ['id_kabupaten']);
            if ($idKabupaten) {
                $kabupaten = DB::table('kabupaten')->where('id_kabupaten', $idKabupaten)->first();
            }
        }

        $info['kelurahan'] = (string) $this->rowValue($kelurahan, ['nama'], $info['kelurahan'] ?? '');
        $info['kecamatan'] = (string) $this->rowValue($kecamatan, ['nama'], $info['kecamatan'] ?? '');
        $info['kabupaten'] = (string) $this->rowValue($kabupaten, ['nama'], $info['kabupaten'] ?? '');
        $info['status_tagging_area'] = (string) ($info['status_tagging_area'] ?? $info['status_lokasi'] ?? 'menunggu');

        return $info;
    }

    private function paralegalTeamRows(mixed $idPosbankum, ?string $currentUserId, $currentUser): array
    {
        $rows = collect();

        if ($idPosbankum && $this->hasTable('posbankum_paralegal') && $this->hasTable('users')) {
            $userKey = $this->userKeyColumn();
            $query = DB::table('posbankum_paralegal as pp')
                ->join('users as u', 'u.' . $userKey, '=', 'pp.id_user')
                ->where('pp.id_posbankum', $idPosbankum);

            if ($this->hasColumn('posbankum_paralegal', 'status')) {
                $query->where('pp.status', 'aktif');
            }

            if ($this->hasColumn('users', 'role')) {
                $query->whereIn('u.role', ['paralegal', 'posbankum']);
            }

            $select = [
                'u.' . $userKey . ' as id_user',
                'u.email',
            ];

            foreach (['nama_lengkap', 'name', 'nomor_telepon', 'phone', 'status', 'role'] as $column) {
                if ($this->hasColumn('users', $column)) {
                    $select[] = 'u.' . $column;
                }
            }

            if ($this->hasColumn('posbankum_paralegal', 'is_primary')) {
                $select[] = 'pp.is_primary';
                $query->orderByDesc('pp.is_primary');
            }

            if ($this->hasColumn('posbankum_paralegal', 'assigned_at')) {
                $select[] = 'pp.assigned_at';
                $query->orderBy('pp.assigned_at');
            }

            $rows = $query->select($select)->limit(200)->get();
        }

        if ($rows->isEmpty() && $idPosbankum && $this->hasTable('users') && $this->hasColumn('users', 'id_posbankum')) {
            $userKey = $this->userKeyColumn();
            $query = DB::table('users')->where('id_posbankum', $idPosbankum);

            if ($this->hasColumn('users', 'role')) {
                $query->whereIn('role', ['paralegal', 'posbankum']);
            }

            if ($this->hasColumn('users', 'status')) {
                $query->where('status', 'aktif');
            }

            $rows = $query->select('*', $userKey . ' as id_user')->limit(200)->get();
        }

        if ($rows->isEmpty() && $idPosbankum && $this->hasTable('paralegal_members') && $this->hasColumn('paralegal_members', 'id_posbankum')) {
            $query = DB::table('paralegal_members')->where('id_posbankum', $idPosbankum);

            if ($this->hasColumn('paralegal_members', 'is_primary')) {
                $query->orderByDesc('is_primary');
            }

            $rows = $query->limit(200)->get();
        }

        $mapped = $rows->values()->map(function ($row, $index) use ($currentUserId) {
            $id = (string) $this->rowValue($row, ['id_user', 'id_paralegal', 'id'], 'paralegal-' . ($index + 1));
            $name = (string) $this->rowValue($row, ['nama_lengkap', 'name', 'nama_paralegal', 'nama', 'email'], 'Paralegal');
            $phone = (string) $this->rowValue($row, ['nomor_telepon', 'phone', 'hp', 'no_hp'], '');

            return [
                'id' => $id,
                'id_user' => $id,
                'name' => $name,
                'nama' => $name,
                'email' => (string) $this->rowValue($row, ['email', 'email_akun', 'email_paralegal'], ''),
                'phone' => $phone,
                'nomor_telepon' => $phone,
                'status' => (string) $this->rowValue($row, ['status', 'rel_status'], 'aktif'),
                'role' => (string) $this->rowValue($row, ['role'], 'paralegal'),
                'is_primary' => (bool) $this->rowValue($row, ['is_primary'], false),
                'is_current' => $currentUserId !== null && $id === $currentUserId,
                'assigned_at' => $this->rowValue($row, ['assigned_at', 'created_at'], null),
            ];
        })->unique('id')->values();

        if ($currentUser && $currentUserId && !$mapped->contains(fn($row) => (string) $row['id'] === $currentUserId)) {
            $mapped->prepend([
                'id' => $currentUserId,
                'id_user' => $currentUserId,
                'name' => (string) ($currentUser->nama_lengkap ?? $currentUser->name ?? 'Paralegal'),
                'nama' => (string) ($currentUser->nama_lengkap ?? $currentUser->name ?? 'Paralegal'),
                'email' => (string) ($currentUser->email ?? ''),
                'phone' => (string) ($currentUser->nomor_telepon ?? $currentUser->phone ?? ''),
                'nomor_telepon' => (string) ($currentUser->nomor_telepon ?? $currentUser->phone ?? ''),
                'status' => (string) ($currentUser->status ?? 'aktif'),
                'role' => (string) ($currentUser->role ?? 'paralegal'),
                'is_primary' => false,
                'is_current' => true,
                'assigned_at' => null,
            ]);
        }

        return $mapped->values()->toArray();
    }

    private function renderDashboard(Request $request): Response
    {
        $user = $request->user();
        $idPosbankum = $this->resolveUserPosbankumId($user);
        $posbankum = $this->posbankumById($idPosbankum);

        return Inertia::render('Paralegal/Dashboard', [
            'auth' => [
                'user' => $user,
            ],
            'posbankum' => $posbankum,
            'currentPosbankum' => $posbankum,
            'stats' => [
                'casesThisMonth' => $this->casesThisMonthCount($idPosbankum),
                'completedActivities' => $this->completedActivitiesCount($idPosbankum),
                'activeParalegal' => $this->paralegalCount($idPosbankum, $posbankum),
            ],
            'kasusTerbaru' => $this->latestPengaduan($idPosbankum),
            'kegiatanTerbaru' => $this->latestKegiatan($idPosbankum),
            'kegiatanRows' => $this->kegiatanRows($idPosbankum),
            'semuaKasusRows' => $this->semuaKasusRows(),
            'posbankumDocuments' => $this->posbankumDocumentRows($idPosbankum),
            'posbankumLocation' => $this->posbankumLocation($posbankum),
            'notifications' => $this->notifications($idPosbankum),
            'laporanPelayananRows' => $this->laporanPelayananRows($idPosbankum),
            'paralegalOptions' => $this->paralegalOptions($idPosbankum),
            'paralegalProfile' => $this->paralegalProfilePayload($user, $idPosbankum, $posbankum),
            'flash' => [
                'success' => session('success'),
            ],
        ]);
    }

    public function paralegal(Request $request): Response
    {
        return $this->renderDashboard($request);
    }

    public function posbankum(Request $request): Response
    {
        return $this->renderDashboard($request);
    }
}
