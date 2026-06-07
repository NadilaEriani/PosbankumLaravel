<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

    private function tableCount(string $table): int
    {
        if (!$this->hasTable($table)) {
            return 0;
        }

        return DB::table($table)->count();
    }

    private function countByForeignKey(string $table, string $foreignKey, array $ids): array
    {
        if (!$this->hasColumn($table, $foreignKey) || empty($ids)) {
            return [];
        }

        return DB::table($table)
            ->select($foreignKey, DB::raw('COUNT(*) as total'))
            ->whereIn($foreignKey, $ids)
            ->groupBy($foreignKey)
            ->pluck('total', $foreignKey)
            ->map(fn($value) => (int) $value)
            ->toArray();
    }

    private function safeRows(string $table, int $limit = 20, ?string $orderColumn = 'created_at')
    {
        if (!$this->hasTable($table)) {
            return collect();
        }

        $query = DB::table($table);

        if ($orderColumn && $this->hasColumn($table, $orderColumn)) {
            $query->orderByDesc($orderColumn);
        }

        return $query->limit($limit)->get();
    }

    private function posbankumRows()
    {
        if (!$this->hasTable('posbankum')) {
            return collect();
        }

        $query = DB::table('posbankum');

        if ($this->hasColumn('posbankum', 'nama')) {
            $query->orderBy('nama');
        }

        return $query->get();
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

    private function buildDetailRows($posRows): array
    {
        $ids = $posRows
            ->map(fn($row) => $this->getPosbankumId($row))
            ->filter()
            ->values()
            ->all();

        $pengaduanCounts = $this->countByForeignKey('pengaduan', 'id_posbankum', $ids);
        $kegiatanCounts = $this->countByForeignKey('kegiatan', 'id_posbankum', $ids);
        $paralegalCounts = [];
        if ($this->hasColumn('users', 'id_posbankum')) {
            $paralegalCounts = DB::table('users')
                ->select('id_posbankum', DB::raw('COUNT(*) as total'))
                ->where('role', 'paralegal')
                ->where('status', 'aktif')
                ->whereIn('id_posbankum', $ids)
                ->groupBy('id_posbankum')
                ->pluck('total', 'id_posbankum')
                ->map(fn($value) => (int) $value)
                ->toArray();
        }

        return $posRows->values()->map(function ($row, $index) use ($pengaduanCounts, $kegiatanCounts, $paralegalCounts) {
            $id = $this->getPosbankumId($row);
            $manualParalegal = (int) $this->rowValue($row, ['jml_paralegal', 'jumlah_paralegal'], 0);

            return [
                'id' => $id,
                'name' => $this->getPosbankumName($row, $index),
                'address' => $this->getPosbankumAddress($row),
                'phone' => $this->getPosbankumPhone($row),
                'email' => $this->getPosbankumEmail($row),
                'paralegalCount' => $manualParalegal > 0 ? $manualParalegal : (int) ($paralegalCounts[$id] ?? 0),
                'caseCount' => (int) ($pengaduanCounts[$id] ?? 0),
                'activityCount' => (int) ($kegiatanCounts[$id] ?? 0),
                'status' => (string) $this->rowValue($row, ['status', 'status_verifikasi'], 'Aktif'),
                'latitude' => $this->rowValue($row, ['latitude', 'lat']),
                'longitude' => $this->rowValue($row, ['longitude', 'lng', 'long']),
            ];
        })->toArray();
    }

    private function waitingVerificationCount(): int
    {
        if (!$this->hasTable('posbankum')) {
            return 0;
        }

        foreach (['status_verifikasi', 'status'] as $column) {
            if ($this->hasColumn('posbankum', $column)) {
                return DB::table('posbankum')
                    ->whereIn($column, ['menunggu', 'pending', 'Menunggu', 'Pending', 'belum diverifikasi'])
                    ->count();
            }
        }

        return 0;
    }

    private function monthKegiatanCount(mixed $idPosbankum = null): int
    {
        if (!$this->hasTable('kegiatan')) {
            return 0;
        }

        $query = DB::table('kegiatan');

        if ($idPosbankum && $this->hasColumn('kegiatan', 'id_posbankum')) {
            $query->where('id_posbankum', $idPosbankum);
        }

        if ($this->hasColumn('kegiatan', 'created_at')) {
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
            $query->whereIn('status', ['selesai', 'diterima', 'Selesai', 'Diterima']);
        }

        return $query->count();
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

    private function latestActivities(): array
    {
        $items = collect();

        $this->safeRows('pengaduan', 5)->each(function ($row) use ($items) {
            $items->push([
                'type' => 'pengaduan',
                'title' => 'Pengaduan baru masuk',
                'description' => (string) $this->rowValue($row, ['judul_laporan', 'judul', 'kategori_masalah', 'jenis_masalah'], 'Data pengaduan diperbarui'),
                'at' => $this->rowValue($row, ['created_at', 'updated_at', 'tanggal', 'tgl_lapor'], now()->toISOString()),
            ]);
        });

        $this->safeRows('kegiatan', 5)->each(function ($row) use ($items) {
            $items->push([
                'type' => 'kegiatan',
                'title' => 'Kegiatan Posbankum diperbarui',
                'description' => (string) $this->rowValue($row, ['nama_kegiatan', 'judul', 'tema', 'deskripsi'], 'Data kegiatan diperbarui'),
                'at' => $this->rowValue($row, ['created_at', 'updated_at', 'tanggal_kegiatan', 'tanggal'], now()->toISOString()),
            ]);
        });

        $this->safeRows('berita', 5)->each(function ($row) use ($items) {
            $items->push([
                'type' => 'berita',
                'title' => 'Berita baru dibuat',
                'description' => (string) $this->rowValue($row, ['judul', 'title'], 'Berita Posbankum diperbarui'),
                'at' => $this->rowValue($row, ['created_at', 'updated_at'], now()->toISOString()),
            ]);
        });

        return $items
            ->sortByDesc(fn($item) => strtotime($item['at'] ?? 'now'))
            ->values()
            ->take(10)
            ->toArray();
    }

    private function masterKabupatenRows(): array
    {
        if (!$this->hasTable('kabupaten')) {
            return [];
        }

        return DB::table('kabupaten')
            ->select('id_kabupaten', 'nama')
            ->orderBy('nama')
            ->get()
            ->map(fn($row) => [
                'id_kabupaten' => $row->id_kabupaten,
                'nama' => $row->nama,
            ])
            ->toArray();
    }

    private function masterKecamatanRows(): array
    {
        if (!$this->hasTable('kecamatan')) {
            return [];
        }

        return DB::table('kecamatan')
            ->select('id_kecamatan', 'id_kabupaten', 'nama')
            ->orderBy('nama')
            ->get()
            ->map(fn($row) => [
                'id_kecamatan' => $row->id_kecamatan,
                'id_kabupaten' => $row->id_kabupaten,
                'nama' => $row->nama,
            ])
            ->toArray();
    }

    private function masterKelurahanRows(): array
    {
        if (!$this->hasTable('kelurahan')) {
            return [];
        }

        $query = DB::table('kelurahan as kel')
            ->leftJoin('kecamatan as kec', 'kec.id_kecamatan', '=', 'kel.id_kecamatan')
            ->select(
                'kel.id_kelurahan',
                'kel.id_kecamatan',
                'kel.nama',
                'kec.id_kabupaten'
            )
            ->orderBy('kel.nama');

        return $query->get()
            ->map(fn($row) => [
                'id_kelurahan' => $row->id_kelurahan,
                'id_kecamatan' => $row->id_kecamatan,
                'id_kabupaten' => $row->id_kabupaten,
                'nama' => $row->nama,
            ])
            ->toArray();
    }

    private function masterPosbankumRows(): array
    {
        if (!$this->hasTable('posbankum')) {
            return [];
        }

        return DB::table('posbankum as p')
            ->leftJoin('kelurahan as kel', 'kel.id_kelurahan', '=', 'p.id_kelurahan')
            ->leftJoin('kecamatan as kec', 'kec.id_kecamatan', '=', 'kel.id_kecamatan')
            ->leftJoin('kabupaten as kab', 'kab.id_kabupaten', '=', 'kec.id_kabupaten')
            ->select(
                'p.id_posbankum',
                'p.id_kelurahan',
                'p.nama',
                'kel.nama as kelurahan_nama',
                'kel.id_kecamatan',
                'kec.nama as kecamatan_nama',
                'kec.id_kabupaten',
                'kab.nama as kabupaten_nama'
            )
            ->orderBy('p.nama')
            ->get()
            ->map(fn($row) => [
                'id_posbankum' => $row->id_posbankum,
                'id_kelurahan' => $row->id_kelurahan,
                'id_kecamatan' => $row->id_kecamatan,
                'id_kabupaten' => $row->id_kabupaten,
                'nama' => $row->nama,
                'kelurahan_nama' => $row->kelurahan_nama,
                'kecamatan_nama' => $row->kecamatan_nama,
                'kabupaten_nama' => $row->kabupaten_nama,
            ])
            ->toArray();
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

    private function verificationRows(): array
    {
        if (!$this->hasTable('posbankum')) {
            return [];
        }

        $posQuery = DB::table('posbankum');

        if ($this->hasColumn('posbankum', 'nama')) {
            $posQuery->orderBy('nama');
        }

        $posRows = $posQuery->get();
        $ids = $posRows
            ->map(fn($row) => $this->getPosbankumId($row))
            ->filter(fn($value) => $value !== null && $value !== '')
            ->values()
            ->all();

        $kelurahanMap = $this->hasTable('kelurahan')
            ? DB::table('kelurahan')->get()->keyBy(fn($row) => $this->rowValue($row, ['id_kelurahan', 'id']))
            : collect();
        $kecamatanMap = $this->hasTable('kecamatan')
            ? DB::table('kecamatan')->get()->keyBy(fn($row) => $this->rowValue($row, ['id_kecamatan', 'id']))
            : collect();
        $kabupatenMap = $this->hasTable('kabupaten')
            ? DB::table('kabupaten')->get()->keyBy(fn($row) => $this->rowValue($row, ['id_kabupaten', 'id']))
            : collect();

        $uploadsByPos = [];

        if ($this->hasColumn('data_posbankum', 'id_posbankum') && !empty($ids)) {
            $uploadQuery = DB::table('data_posbankum')->whereIn('id_posbankum', $ids);
            $orderColumn = $this->firstExistingColumn('data_posbankum', [
                'tgl_upload',
                'tanggal_upload',
                'uploaded_at',
                'created_at',
                'updated_at',
            ]);

            if ($orderColumn) {
                $uploadQuery->orderByDesc($orderColumn);
            }

            $uploadsByPos = $uploadQuery
                ->get()
                ->map(function ($row) {
                    $data = (array) $row;

                    return array_merge($data, [
                        'id_data' => $this->rowValue($row, ['id_data', 'id', 'uuid']),
                        'id_posbankum' => $this->rowValue($row, ['id_posbankum', 'posbankum_id']),
                        'kategori' => $this->rowValue($row, ['kategori', 'jenis_dokumen', 'jenis', 'tipe'], ''),
                        'status_verifikasi' => $this->rowValue($row, ['status_verifikasi', 'status'], 'menunggu'),
                        'catatan_verifikasi' => $this->rowValue($row, ['catatan_verifikasi', 'catatan_admin', 'alasan_penolakan', 'catatan_penolakan'], ''),
                        'path_berkas' => $this->rowValue($row, ['path_berkas', 'path', 'file_path', 'file_url', 'url', 'public_url'], ''),
                        'mime_type' => $this->rowValue($row, ['mime_type', 'mime'], ''),
                        'nama_berkas' => $this->rowValue($row, ['nama_berkas', 'name', 'file_name'], ''),
                        'tgl_upload' => $this->rowValue($row, ['tgl_upload', 'tanggal_upload', 'uploaded_at', 'created_at', 'updated_at']),
                    ]);
                })
                ->groupBy('id_posbankum')
                ->map(fn($items) => $items->values()->toArray())
                ->toArray();
        }

        return $posRows->values()->map(function ($row, $index) use ($uploadsByPos, $kelurahanMap, $kecamatanMap, $kabupatenMap) {
            $id = $this->getPosbankumId($row);
            $idKelurahan = $this->rowValue($row, ['id_kelurahan', 'kelurahan_id']);
            $kelurahan = $idKelurahan ? $kelurahanMap->get($idKelurahan) : null;

            $idKecamatan = $this->rowValue(
                $row,
                ['id_kecamatan', 'kecamatan_id'],
                $kelurahan ? $this->rowValue($kelurahan, ['id_kecamatan', 'kecamatan_id']) : null
            );
            $kecamatan = $idKecamatan ? $kecamatanMap->get($idKecamatan) : null;

            $idKabupaten = $this->rowValue(
                $row,
                ['id_kabupaten', 'kabupaten_id'],
                $kecamatan ? $this->rowValue($kecamatan, ['id_kabupaten', 'kabupaten_id']) : null
            );
            $kabupaten = $idKabupaten ? $kabupatenMap->get($idKabupaten) : null;

            $data = (array) $row;

            return array_merge($data, [
                'id_posbankum' => $id,
                'nama' => $this->getPosbankumName($row, $index),
                'alamat' => $this->getPosbankumAddress($row),
                'nomor_tlp' => $this->getPosbankumPhone($row),
                'email_akun' => $this->getPosbankumEmail($row),
                'id_kelurahan' => $idKelurahan,
                'id_kecamatan' => $idKecamatan,
                'id_kabupaten' => $idKabupaten,
                'kelurahan_nama' => $kelurahan ? $this->rowValue($kelurahan, ['nama', 'name'], '') : '',
                'kecamatan_nama' => $kecamatan ? $this->rowValue($kecamatan, ['nama', 'name'], '') : '',
                'kabupaten_nama' => $kabupaten ? $this->rowValue($kabupaten, ['nama', 'name'], '') : '',
                'latitude' => $this->rowValue($row, ['latitude', 'lat', 'latitude_pos']),
                'longitude' => $this->rowValue($row, ['longitude', 'lng', 'long', 'longitude_pos']),
                'uploads' => $uploadsByPos[$id] ?? [],
            ]);
        })->toArray();
    }

    private function accountRows(): array
    {
        if (!$this->hasTable('users')) {
            return [];
        }

        return DB::table('users as u')
            ->leftJoin('posbankum as p', 'p.id_posbankum', '=', 'u.id_posbankum')
            ->leftJoin('kelurahan as kel', 'kel.id_kelurahan', '=', 'p.id_kelurahan')
            ->leftJoin('kecamatan as kec', 'kec.id_kecamatan', '=', 'kel.id_kecamatan')
            ->leftJoin('kabupaten as kab', 'kab.id_kabupaten', '=', 'kec.id_kabupaten')
            ->where('u.role', 'paralegal')
            ->where('u.status', 'aktif')
            ->select(
                'u.id_user',
                'u.nama_lengkap',
                'u.email',
                'u.nomor_telepon',
                'u.status',
                'u.id_posbankum',
                'p.nama as posbankum_nama',
                'p.id_kelurahan',
                'kel.nama as kelurahan_nama',
                'kel.id_kecamatan',
                'kec.nama as kecamatan_nama',
                'kec.id_kabupaten',
                'kab.nama as kabupaten_nama'
            )
            ->orderBy('u.nama_lengkap')
            ->get()
            ->map(fn($row) => [
                'id_user' => $row->id_user,
                'nama_lengkap' => $row->nama_lengkap,
                'email' => $row->email,
                'nomor_telepon' => $row->nomor_telepon,
                'status' => $row->status,
                'id_posbankum' => $row->id_posbankum,
                'posbankum_nama' => $row->posbankum_nama,
                'id_kelurahan' => $row->id_kelurahan,
                'id_kecamatan' => $row->id_kecamatan,
                'id_kabupaten' => $row->id_kabupaten,
                'kelurahan_nama' => $row->kelurahan_nama,
                'kecamatan_nama' => $row->kecamatan_nama,
                'kabupaten_nama' => $row->kabupaten_nama,
            ])
            ->toArray();
    }


    private function beritaRows(): array
    {
        if (!$this->hasTable('berita')) {
            return [];
        }

        $select = collect([
            'id_berita',
            'id',
            'id_user',
            'judul',
            'title',
            'isi',
            'content',
            'gambar',
            'image',
            'image_path',
            'tgl_publish',
            'created_at',
            'updated_at',
            'kategori',
            'category',
        ])->filter(fn($column) => $this->hasColumn('berita', $column))->values()->all();

        $query = DB::table('berita');

        if (!empty($select)) {
            $query->select($select);
        }

        foreach (['tgl_publish', 'created_at', 'updated_at'] as $orderColumn) {
            if ($this->hasColumn('berita', $orderColumn)) {
                $query->orderByDesc($orderColumn);
                break;
            }
        }

        $rows = $query->get();
        $userIds = $rows
            ->map(fn($row) => $this->rowValue($row, ['id_user']))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $authors = [];
        if (!empty($userIds) && $this->hasTable('users') && $this->hasColumn('users', 'id_user')) {
            $userSelect = collect(['id_user', 'nama_lengkap', 'name', 'email'])
                ->filter(fn($column) => $this->hasColumn('users', $column))
                ->values()
                ->all();

            DB::table('users')
                ->select($userSelect)
                ->whereIn('id_user', $userIds)
                ->get()
                ->each(function ($user) use (&$authors) {
                    $id = $this->rowValue($user, ['id_user']);
                    if (!$id) {
                        return;
                    }

                    $authors[$id] = (string) $this->rowValue($user, ['nama_lengkap', 'name', 'email'], 'Admin');
                });
        }

        return $rows->values()->map(function ($row, $index) use ($authors) {
            $id = $this->rowValue($row, ['id_berita', 'id'], $index + 1);
            $userId = $this->rowValue($row, ['id_user']);
            $image = (string) $this->rowValue($row, ['gambar', 'image_path', 'image'], '');
            $publishedAt = $this->rowValue($row, ['tgl_publish', 'created_at', 'updated_at'], now()->toISOString());
            $category = (string) $this->rowValue($row, ['kategori', 'category'], 'Kegiatan');
            $title = (string) $this->rowValue($row, ['judul', 'title'], 'Tanpa Judul');
            $content = (string) $this->rowValue($row, ['isi', 'content'], '');

            return [
                'id' => $id,
                'id_berita' => $id,
                'id_user' => $userId,
                'judul' => $title,
                'title' => $title,
                'isi' => $content,
                'content' => $content,
                'gambar' => $image,
                'image' => $image,
                'tgl_publish' => $publishedAt,
                'date' => $publishedAt,
                'kategori' => $category,
                'category' => $category,
                'authorName' => $authors[$userId] ?? 'Admin',
                'author' => $authors[$userId] ?? 'Admin',
            ];
        })->toArray();
    }

    public function admin(Request $request): Response
    {
        $posRows = $this->posbankumRows();
        $detailRows = $this->buildDetailRows($posRows);

        $maxActivity = max(array_map(fn($row) => ($row['caseCount'] ?? 0) + ($row['activityCount'] ?? 0), $detailRows) ?: [1]);

        $topActive = collect($detailRows)
            ->map(function ($row, $index) use ($maxActivity) {
                $total = ($row['caseCount'] ?? 0) + ($row['activityCount'] ?? 0);

                return [
                    ...$row,
                    'percent' => $maxActivity > 0 ? max(18, round(($total / $maxActivity) * 100)) : 18,
                    'growth' => $total > 0 ? min(99, 8 + ($index * 3)) : 0,
                ];
            })
            ->sortByDesc(fn($row) => ($row['caseCount'] ?? 0) + ($row['activityCount'] ?? 0))
            ->values()
            ->take(6)
            ->toArray();

        return Inertia::render('Admin/Dashboard', [
            'auth' => [
                'user' => $request->user(),
            ],
            'stats' => [
                'totalPosbankum' => $this->tableCount('posbankum'),
                'waitingVerification' => $this->waitingVerificationCount(),
                'monthKegiatan' => $this->monthKegiatanCount(),
            ],
            'topActive' => $topActive,
            'activities' => $this->latestActivities(),
            'detailRows' => $detailRows,
            'accountRows' => $this->accountRows(),
            'kabupatenRows' => $this->masterKabupatenRows(),
            'kecamatanRows' => $this->masterKecamatanRows(),
            'kelurahanRows' => $this->masterKelurahanRows(),
            'posbankumMasterRows' => $this->masterPosbankumRows(),
            'beritaRows' => $this->beritaRows(),
            'verificationRows' => $this->verificationRows(),
        ]);
    }

    private function resolveUserPosbankumId($user): mixed
    {
        if (!$user) {
            return null;
        }

        foreach (['id_posbankum', 'posbankum_id'] as $key) {
            if (!empty($user->{$key})) {
                return $user->{$key};
            }
        }

        if ($this->hasTable('paralegal_members')) {
            $query = DB::table('paralegal_members');

            if ($this->hasColumn('paralegal_members', 'user_id')) {
                $found = (clone $query)->where('user_id', $user->id)->value('id_posbankum');
                if ($found)
                    return $found;
            }

            foreach (['email', 'email_akun'] as $column) {
                if ($this->hasColumn('paralegal_members', $column) && !empty($user->email)) {
                    $found = DB::table('paralegal_members')->where($column, $user->email)->value('id_posbankum');
                    if ($found)
                        return $found;
                }
            }
        }

        return null;
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
            'nama' => $this->getPosbankumName($row),
            'alamat' => $this->getPosbankumAddress($row),
            'email_akun' => $this->getPosbankumEmail($row),
            'nomor_tlp' => $this->getPosbankumPhone($row),
            'jml_paralegal' => (int) $this->rowValue($row, ['jml_paralegal', 'jumlah_paralegal'], 0),
        ];
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

        if ($this->hasColumn('pengaduan', 'created_at')) {
            $query->orderByDesc('created_at');
        }

        return $query->limit(6)->get()->map(function ($row, $index) {
            return [
                'id' => $this->rowValue($row, ['id_pengaduan', 'id'], $index + 1),
                'title' => (string) $this->rowValue($row, ['judul_laporan', 'judul', 'kategori_masalah', 'jenis_masalah'], 'Pengaduan #' . ($index + 1)),
                'description' => (string) $this->rowValue($row, ['deskripsi', 'uraian', 'isi_pengaduan', 'catatan_admin'], 'Belum ada deskripsi.'),
                'status' => (string) $this->rowValue($row, ['status'], 'Dalam Proses'),
                'location' => (string) $this->rowValue($row, ['lokasi', 'alamat'], 'Posbankum'),
                'date' => $this->rowValue($row, ['created_at', 'updated_at', 'tanggal', 'tgl_lapor'], now()->toISOString()),
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

        if ($this->hasColumn('kegiatan', 'created_at')) {
            $query->orderByDesc('created_at');
        }

        return $query->limit(6)->get()->map(function ($row, $index) {
            return [
                'id' => $this->rowValue($row, ['id_kegiatan', 'id'], $index + 1),
                'title' => (string) $this->rowValue($row, ['nama_kegiatan', 'judul', 'tema'], 'Kegiatan #' . ($index + 1)),
                'description' => (string) $this->rowValue($row, ['deskripsi', 'catatan', 'lokasi'], 'Belum ada deskripsi kegiatan.'),
                'status' => (string) $this->rowValue($row, ['status'], 'Diproses'),
                'date' => $this->rowValue($row, ['tanggal_kegiatan', 'tanggal', 'created_at'], now()->toISOString()),
            ];
        })->toArray();
    }

    private function notifications(mixed $idPosbankum = null): array
    {
        if (!$this->hasTable('notifikasi')) {
            return [
                [
                    'id' => 'welcome',
                    'title' => 'Selamat datang di dashboard Posbankum',
                    'message' => 'Notifikasi akan muncul setelah data notifikasi tersedia di database.',
                    'kategori' => 'sistem',
                    'is_read' => false,
                    'created_at' => now()->toISOString(),
                ]
            ];
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
                'title' => (string) $this->rowValue($row, ['judul', 'title'], 'Notifikasi'),
                'message' => (string) $this->rowValue($row, ['pesan', 'message', 'deskripsi'], 'Tidak ada pesan.'),
                'kategori' => (string) $this->rowValue($row, ['kategori', 'type'], 'sistem'),
                'is_read' => (bool) $this->rowValue($row, ['is_read', 'dibaca'], false),
                'created_at' => $this->rowValue($row, ['created_at', 'tanggal'], now()->toISOString()),
            ];
        })->toArray();
    }

    private function paralegalCount(mixed $idPosbankum, array $posbankum): int
    {
        if (!$idPosbankum) {
            return (int) ($posbankum['jml_paralegal'] ?? 0);
        }

        if ($this->hasColumn('paralegal_members', 'id_posbankum')) {
            return DB::table('paralegal_members')->where('id_posbankum', $idPosbankum)->count();
        }

        return (int) ($posbankum['jml_paralegal'] ?? 0);
    }

    public function posbankum(Request $request): Response
    {
        $user = $request->user();
        $idPosbankum = $this->resolveUserPosbankumId($user);
        $posbankum = $this->posbankumById($idPosbankum);

        return Inertia::render('Posbankum/Dashboard', [
            'auth' => [
                'user' => $user,
            ],
            'posbankum' => $posbankum,
            'stats' => [
                'casesThisMonth' => $this->casesThisMonthCount($idPosbankum),
                'completedActivities' => $this->completedActivitiesCount($idPosbankum),
                'activeParalegal' => $this->paralegalCount($idPosbankum, $posbankum),
            ],
            'kasusTerbaru' => $this->latestPengaduan($idPosbankum),
            'kegiatanTerbaru' => $this->latestKegiatan($idPosbankum),
            'notifications' => $this->notifications($idPosbankum),
        ]);
    }
}
