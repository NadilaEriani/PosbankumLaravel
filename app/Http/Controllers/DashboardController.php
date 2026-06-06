<?php

namespace App\Http\Controllers;

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
