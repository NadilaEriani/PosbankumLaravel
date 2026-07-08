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
    private function publicPreviewUrl(mixed $path, ?string $name = null): string
    {
        $raw = trim(str_replace('\\', '/', (string) $path));

        if ($raw === '') {
            return '';
        }

        if (preg_match('/^(data:|blob:)/i', $raw)) {
            return $raw;
        }

        if (preg_match('/^https?:\/\//i', $raw)) {
            $urlPath = parse_url($raw, PHP_URL_PATH) ?: '';

            if (!preg_match('#/(storage|public|app/public)/#i', $urlPath)) {
                return $raw;
            }

            $raw = $urlPath;
        }

        $clean = preg_replace('~[?#].*$~', '', $raw);
        $clean = preg_replace('#^/+#', '', (string) $clean);
        $clean = preg_replace('#^(storage|public|app/public)/#i', '', $clean);
        $clean = ltrim(str_replace('\\', '/', (string) $clean), '/');

        if ($clean === '' || str_contains($clean, "\0") || str_contains($clean, '..')) {
            return '';
        }

        $query = ['path' => $clean];

        if ($name !== null && trim($name) !== '') {
            $query['name'] = trim($name);
        }

        return '/file-preview?' . http_build_query($query);
    }

    private function firstPersonName(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        if (is_array($value)) {
            foreach ($value as $item) {
                if (is_string($item) && trim($item) !== '') {
                    return trim($item);
                }

                if (is_array($item) || is_object($item)) {
                    $name = (string) $this->rowValue($item, ['nama', 'name', 'nama_lengkap'], '');
                    if (trim($name) !== '') {
                        return trim($name);
                    }
                }
            }

            return '';
        }

        if (is_object($value)) {
            return trim((string) $this->rowValue($value, ['nama', 'name', 'nama_lengkap'], ''));
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return '';
        }

        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $name = $this->firstPersonName($decoded);
            if ($name !== '') {
                return $name;
            }
        }

        return trim($raw, " []\t\n\r\0\x0B\"'");
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


    private function canFilterPengaduanViaParalegal(): bool
    {
        return $this->hasColumn('pengaduan', 'user_id')
            && $this->hasColumn('posbankum_paralegal', 'id_user')
            && $this->hasColumn('posbankum_paralegal', 'id_posbankum');
    }

    private function canFilterPengaduanViaMasyarakat(): bool
    {
        return $this->hasColumn('pengaduan', 'user_id')
            && $this->hasColumn('masyarakat', 'id_user')
            && $this->hasColumn('masyarakat', 'id_kelurahan')
            && $this->hasColumn('posbankum', 'id_kelurahan')
            && $this->hasColumn('posbankum', 'id_posbankum');
    }

    private function applyPengaduanPosbankumFilter($query, mixed $idPosbankum)
    {
        if (!$idPosbankum) {
            return $query;
        }

        if ($this->hasColumn('pengaduan', 'id_posbankum')) {
            return $query->where('id_posbankum', $idPosbankum);
        }

        $canViaParalegal = $this->canFilterPengaduanViaParalegal();
        $canViaMasyarakat = $this->canFilterPengaduanViaMasyarakat();

        if (!$canViaParalegal && !$canViaMasyarakat) {
            return $query;
        }

        return $query->where(function ($inner) use ($idPosbankum, $canViaParalegal, $canViaMasyarakat) {
            if ($canViaParalegal) {
                $inner->orWhereExists(function ($sub) use ($idPosbankum) {
                    $sub->select(DB::raw(1))
                        ->from('posbankum_paralegal as pp')
                        ->whereColumn('pp.id_user', 'pengaduan.user_id')
                        ->where('pp.id_posbankum', $idPosbankum);

                    if ($this->hasColumn('posbankum_paralegal', 'status')) {
                        $sub->where('pp.status', 'aktif');
                    }
                });
            }

            if ($canViaMasyarakat) {
                $inner->orWhereExists(function ($sub) use ($idPosbankum) {
                    $sub->select(DB::raw(1))
                        ->from('masyarakat as m')
                        ->join('posbankum as p', 'p.id_kelurahan', '=', 'm.id_kelurahan')
                        ->whereColumn('m.id_user', 'pengaduan.user_id')
                        ->where('p.id_posbankum', $idPosbankum);
                });
            }
        });
    }

    private function pengaduanCountsByPosbankum(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        if ($this->hasColumn('pengaduan', 'id_posbankum')) {
            return $this->countByForeignKey('pengaduan', 'id_posbankum', $ids);
        }

        $counts = [];

        if ($this->canFilterPengaduanViaParalegal()) {
            $query = DB::table('pengaduan as pg')
                ->join('posbankum_paralegal as pp', 'pp.id_user', '=', 'pg.user_id')
                ->whereIn('pp.id_posbankum', $ids);

            if ($this->hasColumn('posbankum_paralegal', 'status')) {
                $query->where('pp.status', 'aktif');
            }

            foreach ($query->select('pp.id_posbankum', DB::raw('COUNT(DISTINCT pg.id_pengaduan) as total'))
                ->groupBy('pp.id_posbankum')
                ->pluck('total', 'pp.id_posbankum') as $id => $total) {
                $counts[$id] = ($counts[$id] ?? 0) + (int) $total;
            }
        }

        if ($this->canFilterPengaduanViaMasyarakat()) {
            foreach (DB::table('pengaduan as pg')
                ->join('masyarakat as m', 'm.id_user', '=', 'pg.user_id')
                ->join('posbankum as p', 'p.id_kelurahan', '=', 'm.id_kelurahan')
                ->whereIn('p.id_posbankum', $ids)
                ->select('p.id_posbankum', DB::raw('COUNT(DISTINCT pg.id_pengaduan) as total'))
                ->groupBy('p.id_posbankum')
                ->pluck('total', 'p.id_posbankum') as $id => $total) {
                $counts[$id] = ($counts[$id] ?? 0) + (int) $total;
            }
        }

        return $counts;
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

    private function cleanContactValue(mixed $value): string
    {
        $text = trim((string) ($value ?? ''));

        if ($text === '' || $text === '-' || strtolower($text) === 'null') {
            return '';
        }

        return $text;
    }

    private function firstParalegalContactsByPosbankum(array $ids): array
    {
        if (empty($ids) || !$this->hasTable('users') || !$this->hasColumn('posbankum_paralegal', 'id_user') || !$this->hasColumn('posbankum_paralegal', 'id_posbankum')) {
            return [];
        }

        $userKey = $this->hasColumn('users', 'id_user') ? 'id_user' : 'id';
        $query = DB::table('posbankum_paralegal as pp')
            ->join('users as u', 'u.' . $userKey, '=', 'pp.id_user')
            ->whereIn('pp.id_posbankum', $ids);

        if ($this->hasColumn('posbankum_paralegal', 'status')) {
            $query->where('pp.status', 'aktif');
        }

        if ($this->hasColumn('users', 'role')) {
            $query->where('u.role', 'paralegal');
        }

        if ($this->hasColumn('users', 'status')) {
            $query->where('u.status', 'aktif');
        }

        $select = [
            'pp.id_posbankum',
            'u.' . $userKey . ' as id_user',
        ];

        foreach (['nama_lengkap', 'name', 'email', 'email_kantor', 'email_akun', 'nomor_telepon', 'nomor_tlp', 'no_hp', 'phone', 'telepon'] as $column) {
            if ($this->hasColumn('users', $column)) {
                $select[] = 'u.' . $column;
            }
        }

        if ($this->hasColumn('posbankum_paralegal', 'assigned_at')) {
            $select[] = 'pp.assigned_at as relasi_assigned_at';
            $query->orderBy('pp.assigned_at');
        }

        if ($this->hasColumn('posbankum_paralegal', 'created_at')) {
            $select[] = 'pp.created_at as relasi_created_at';
            $query->orderBy('pp.created_at');
        }

        if ($this->hasColumn('users', 'created_at')) {
            $select[] = 'u.created_at as user_created_at';
            $query->orderBy('u.created_at');
        }

        if ($this->hasColumn('users', 'nama_lengkap')) {
            $query->orderBy('u.nama_lengkap');
        } elseif ($this->hasColumn('users', 'name')) {
            $query->orderBy('u.name');
        } elseif ($this->hasColumn('users', 'email')) {
            $query->orderBy('u.email');
        }

        $contacts = [];

        foreach ($query->select($select)->get() as $row) {
            $idPosbankum = (string) $this->rowValue($row, ['id_posbankum'], '');

            if ($idPosbankum === '' || isset($contacts[$idPosbankum])) {
                continue;
            }

            $phone = $this->cleanContactValue($this->rowValue($row, ['nomor_telepon', 'nomor_tlp', 'no_hp', 'phone', 'telepon'], ''));
            $email = $this->cleanContactValue($this->rowValue($row, ['email', 'email_kantor', 'email_akun'], ''));
            $name = $this->cleanContactValue($this->rowValue($row, ['nama_lengkap', 'name', 'email'], ''));

            $contacts[$idPosbankum] = [
                'id_user' => $this->rowValue($row, ['id_user']),
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'assigned_at' => $this->rowValue($row, ['relasi_assigned_at', 'relasi_created_at', 'user_created_at']),
            ];
        }

        return $contacts;
    }

    private function buildDetailRows($posRows): array
    {
        $ids = $posRows
            ->map(fn($row) => $this->getPosbankumId($row))
            ->filter()
            ->values()
            ->all();

        $pengaduanCounts = $this->pengaduanCountsByPosbankum($ids);
        $kegiatanCounts = $this->countByForeignKey('kegiatan', 'id_posbankum', $ids);
        $firstParalegalContacts = $this->firstParalegalContactsByPosbankum($ids);
        $paralegalCounts = [];

        if ($this->hasColumn('posbankum_paralegal', 'id_posbankum')) {
            $query = DB::table('posbankum_paralegal')
                ->select('id_posbankum', DB::raw('COUNT(*) as total'))
                ->whereIn('id_posbankum', $ids);

            if ($this->hasColumn('posbankum_paralegal', 'status')) {
                $query->where('status', 'aktif');
            }

            $paralegalCounts = $query
                ->groupBy('id_posbankum')
                ->pluck('total', 'id_posbankum')
                ->map(fn($value) => (int) $value)
                ->toArray();
        } elseif ($this->hasColumn('users', 'id_posbankum')) {
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

        return $posRows->values()->map(function ($row, $index) use ($pengaduanCounts, $kegiatanCounts, $paralegalCounts, $firstParalegalContacts) {
            $id = $this->getPosbankumId($row);
            $idKey = (string) $id;
            $manualParalegal = (int) $this->rowValue($row, ['jml_paralegal', 'jumlah_paralegal'], 0);
            $firstParalegal = $firstParalegalContacts[$idKey] ?? [];

            $posbankumPhone = $this->cleanContactValue($this->getPosbankumPhone($row));
            $posbankumEmail = $this->cleanContactValue($this->getPosbankumEmail($row));
            $paralegalPhone = $this->cleanContactValue($this->rowValue($firstParalegal, ['phone'], ''));
            $paralegalEmail = $this->cleanContactValue($this->rowValue($firstParalegal, ['email'], ''));
            $phone = $paralegalPhone !== '' ? $paralegalPhone : $posbankumPhone;
            $email = $paralegalEmail !== '' ? $paralegalEmail : $posbankumEmail;

            return [
                'id' => $id,
                'id_posbankum' => $id,
                'name' => $this->getPosbankumName($row, $index),
                'address' => $this->getPosbankumAddress($row),
                'phone' => $phone !== '' ? $phone : '-',
                'email' => $email !== '' ? $email : '-',
                'paralegalPhone' => $paralegalPhone !== '' ? $paralegalPhone : '-',
                'paralegalEmail' => $paralegalEmail !== '' ? $paralegalEmail : '-',
                'paralegalName' => (string) $this->rowValue($firstParalegal, ['name'], ''),
                'contactSource' => $paralegalPhone !== '' || $paralegalEmail !== '' ? 'paralegal' : 'posbankum',
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

        $query = $this->applyPengaduanPosbankumFilter($query, $idPosbankum);

        if ($this->hasColumn('pengaduan', 'created_at')) {
            $query->whereBetween('created_at', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()]);
        }

        return $query->count();
    }

    private function latestActivities(): array
    {
        $items = collect();

        if ($this->hasTable('kegiatan')) {
            $query = DB::table('kegiatan as k');
            $canJoinPosbankum = $this->hasTable('posbankum')
                && $this->hasColumn('kegiatan', 'id_posbankum')
                && $this->hasColumn('posbankum', 'id_posbankum');

            if ($canJoinPosbankum) {
                $query->leftJoin('posbankum as p', 'p.id_posbankum', '=', 'k.id_posbankum');
            }

            $select = ['k.*'];

            if ($canJoinPosbankum) {
                $select[] = 'p.nama as posbankum_nama';
            }

            $dateColumns = collect(['updated_at', 'tgl_upload', 'created_at', 'tgl_mulai'])
                ->filter(fn($column) => $this->hasColumn('kegiatan', $column))
                ->values()
                ->all();

            foreach ($dateColumns as $dateColumn) {
                $query->orderByDesc('k.' . $dateColumn);
            }

            $query->select($select)
                ->limit(25)
                ->get()
                ->each(function ($row) use ($items) {
                    $posbankumName = trim((string) $this->rowValue($row, ['posbankum_nama'], 'Posbankum'));
                    $judul = trim((string) $this->rowValue($row, ['judul', 'nama_kegiatan', 'tema'], 'kegiatan'));
                    $status = strtolower(trim((string) $this->rowValue($row, ['status'], '')));
                    $createdValue = $this->rowValue($row, ['created_at', 'tgl_upload', 'tgl_mulai']);
                    $updatedValue = $this->rowValue($row, ['updated_at']);
                    $createdTime = $createdValue ? strtotime((string) $createdValue) : false;
                    $updatedTime = $updatedValue ? strtotime((string) $updatedValue) : false;
                    $isUpdatedActivity = $updatedTime !== false
                        && ($createdTime === false || $updatedTime > ($createdTime + 5));
                    $isNewSubmission = !$isUpdatedActivity
                        && in_array($status, ['draft', 'diproses', 'menunggu', 'pending'], true);
                    $dateValue = $isUpdatedActivity
                        ? $updatedValue
                        : $this->rowValue($row, ['tgl_upload', 'created_at', 'tgl_mulai', 'updated_at'], now()->toDateTimeString());
                    $idKegiatan = $this->rowValue($row, ['id_kegiatan', 'id']);

                    $items->push([
                        'type' => 'kegiatan',
                        'title' => $isNewSubmission
                            ? $posbankumName . ' mengajukan kegiatan baru'
                            : $posbankumName . ' memperbarui laporan kegiatan',
                        'description' => $isNewSubmission
                            ? 'Pengajuan kegiatan ' . $judul . ' telah tercatat dan menunggu verifikasi.'
                            : 'Kegiatan ' . $judul . ' telah diperbarui. Status saat ini ' . ($this->rowValue($row, ['status'], 'diperbarui')) . '.',
                        'at' => $dateValue,
                        'posbankum' => $posbankumName,
                        'targetPath' => $idKegiatan ? '/admin/laporan-kegiatan/detail/' . rawurlencode((string) $idKegiatan) : '',
                    ]);
                });
        }

        if ($this->hasTable('posbankum_paralegal')) {
            $query = DB::table('posbankum_paralegal as pp');
            $canJoinPosbankum = $this->hasTable('posbankum')
                && $this->hasColumn('posbankum_paralegal', 'id_posbankum')
                && $this->hasColumn('posbankum', 'id_posbankum');
            $canJoinUsers = $this->hasTable('users')
                && $this->hasColumn('posbankum_paralegal', 'id_user')
                && $this->hasColumn('users', 'id_user');

            if ($canJoinPosbankum) {
                $query->leftJoin('posbankum as p', 'p.id_posbankum', '=', 'pp.id_posbankum');
            }

            if ($canJoinUsers) {
                $query->leftJoin('users as u', 'u.id_user', '=', 'pp.id_user');
            }

            $select = ['pp.*'];

            if ($canJoinPosbankum) {
                $select[] = 'p.nama as posbankum_nama';
            }

            if ($canJoinUsers) {
                $select[] = 'u.nama_lengkap as paralegal_nama';
            }

            $dateColumn = $this->firstExistingColumn('posbankum_paralegal', ['assigned_at', 'created_at', 'updated_at']);

            if ($dateColumn) {
                $query->orderByDesc('pp.' . $dateColumn);
            }

            $query->select($select)
                ->limit(25)
                ->get()
                ->each(function ($row) use ($items, $dateColumn) {
                    $posbankumName = trim((string) $this->rowValue($row, ['posbankum_nama'], 'Posbankum'));
                    $paralegalName = trim((string) $this->rowValue($row, ['paralegal_nama'], 'paralegal'));
                    $dateValue = $dateColumn
                        ? $this->rowValue($row, [$dateColumn], now()->toDateTimeString())
                        : now()->toDateTimeString();
                    $idPosbankum = $this->rowValue($row, ['id_posbankum']);

                    $items->push([
                        'type' => 'paralegal',
                        'title' => $posbankumName . ' memperbarui data paralegal',
                        'description' => 'Data kontak dan identitas ' . $paralegalName . ' diperbarui pada modul Data Posbankum.',
                        'at' => $dateValue,
                        'posbankum' => $posbankumName,
                        'targetPath' => $idPosbankum ? '/admin/data-posbankum/detail/' . rawurlencode((string) $idPosbankum) : '',
                    ]);
                });
        }

        if ($this->hasTable('data_posbankum')) {
            $query = DB::table('data_posbankum as dp');
            $canJoinPosbankum = $this->hasTable('posbankum')
                && $this->hasColumn('data_posbankum', 'id_posbankum')
                && $this->hasColumn('posbankum', 'id_posbankum');

            if ($canJoinPosbankum) {
                $query->leftJoin('posbankum as p', 'p.id_posbankum', '=', 'dp.id_posbankum');
            }

            $select = ['dp.*'];

            if ($canJoinPosbankum) {
                $select[] = 'p.nama as posbankum_nama';
            }

            $dateColumn = $this->firstExistingColumn('data_posbankum', ['tgl_upload', 'created_at', 'updated_at']);

            if ($dateColumn) {
                $query->orderByDesc('dp.' . $dateColumn);
            }

            $query->select($select)
                ->limit(20)
                ->get()
                ->each(function ($row) use ($items, $dateColumn) {
                    $posbankumName = trim((string) $this->rowValue($row, ['posbankum_nama'], 'Posbankum'));
                    $dokumen = trim((string) $this->rowValue($row, ['nama_berkas', 'kategori'], 'dokumen'));
                    $dateValue = $dateColumn
                        ? $this->rowValue($row, [$dateColumn], now()->toDateTimeString())
                        : now()->toDateTimeString();
                    $idPosbankum = $this->rowValue($row, ['id_posbankum']);

                    $items->push([
                        'type' => 'dokumen',
                        'title' => $posbankumName . ' mengunggah dokumen baru',
                        'description' => 'Dokumen ' . $dokumen . ' masuk untuk proses verifikasi.',
                        'at' => $dateValue,
                        'posbankum' => $posbankumName,
                        'targetPath' => $idPosbankum ? '/admin/verifikasi-data-posbankum/detail/' . rawurlencode((string) $idPosbankum) : '',
                    ]);
                });
        }





        if ($this->hasTable('berita')) {
            $query = DB::table('berita');
            $dateColumn = $this->firstExistingColumn('berita', ['tgl_publish', 'created_at', 'updated_at']);

            if ($dateColumn) {
                $query->orderByDesc($dateColumn);
            }

            $query->limit(15)
                ->get()
                ->each(function ($row) use ($items, $dateColumn) {
                    $dateValue = $dateColumn
                        ? $this->rowValue($row, [$dateColumn], now()->toDateTimeString())
                        : now()->toDateTimeString();
                    $idBerita = $this->rowValue($row, ['id_berita', 'id']);

                    $items->push([
                        'type' => 'berita',
                        'title' => 'Berita baru dibuat',
                        'description' => (string) $this->rowValue($row, ['judul', 'title'], 'Berita Posbankum diperbarui'),
                        'at' => $dateValue,
                        'posbankum' => 'Admin',
                        'targetPath' => $idBerita ? '/admin/kelola-berita/detail/' . rawurlencode((string) $idBerita) : '',
                    ]);
                });
        }

        return $items
            ->sortByDesc(fn($item) => strtotime((string) ($item['at'] ?? 'now')))
            ->values()
            ->take(80)
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

        $userKey = $this->hasColumn('users', 'id_user') ? 'id_user' : 'id';
        $query = DB::table('users as u');
        $select = [
            'u.' . $userKey . ' as id_user',
        ];

        foreach (['nama_lengkap', 'name', 'email', 'email_kantor', 'email_akun', 'nomor_telepon', 'nomor_tlp', 'no_hp', 'phone', 'telepon', 'status', 'created_at'] as $column) {
            if ($this->hasColumn('users', $column)) {
                $select[] = 'u.' . $column;
            }
        }

        $hasParalegalRelation = $this->hasColumn('posbankum_paralegal', 'id_user') && $this->hasColumn('posbankum_paralegal', 'id_posbankum');

        if ($hasParalegalRelation) {
            $query->leftJoin('posbankum_paralegal as pp', function ($join) use ($userKey) {
                $join->on('pp.id_user', '=', 'u.' . $userKey);

                if ($this->hasColumn('posbankum_paralegal', 'status')) {
                    $join->where('pp.status', '=', 'aktif');
                }
            });

            $select[] = 'pp.id_posbankum';

            if ($this->hasColumn('posbankum_paralegal', 'assigned_at')) {
                $select[] = 'pp.assigned_at';
            }

            if ($this->hasColumn('posbankum_paralegal', 'created_at')) {
                $select[] = 'pp.created_at as relasi_created_at';
            }
        } elseif ($this->hasColumn('users', 'id_posbankum')) {
            $select[] = 'u.id_posbankum';
        }

        if ($this->hasTable('posbankum')) {
            if ($hasParalegalRelation) {
                $query->leftJoin('posbankum as p', 'p.id_posbankum', '=', 'pp.id_posbankum');
            } elseif ($this->hasColumn('users', 'id_posbankum')) {
                $query->leftJoin('posbankum as p', 'p.id_posbankum', '=', 'u.id_posbankum');
            }

            $select[] = 'p.nama as posbankum_nama';
            $select[] = 'p.id_kelurahan';
        }

        if ($this->hasTable('kelurahan')) {
            $query->leftJoin('kelurahan as kel', 'kel.id_kelurahan', '=', 'p.id_kelurahan');
            $select[] = 'kel.nama as kelurahan_nama';
            $select[] = 'kel.id_kecamatan';
        }

        if ($this->hasTable('kecamatan')) {
            $query->leftJoin('kecamatan as kec', 'kec.id_kecamatan', '=', 'kel.id_kecamatan');
            $select[] = 'kec.nama as kecamatan_nama';
            $select[] = 'kec.id_kabupaten';
        }

        if ($this->hasTable('kabupaten')) {
            $query->leftJoin('kabupaten as kab', 'kab.id_kabupaten', '=', 'kec.id_kabupaten');
            $select[] = 'kab.nama as kabupaten_nama';
        }

        if ($this->hasColumn('users', 'role')) {
            $query->where('u.role', 'paralegal');
        }

        if ($this->hasColumn('users', 'status')) {
            $query->where('u.status', 'aktif');
        }

        if ($hasParalegalRelation && $this->hasColumn('posbankum_paralegal', 'assigned_at')) {
            $query->orderBy('pp.assigned_at');
        } elseif ($hasParalegalRelation && $this->hasColumn('posbankum_paralegal', 'created_at')) {
            $query->orderBy('pp.created_at');
        } elseif ($this->hasColumn('users', 'created_at')) {
            $query->orderBy('u.created_at');
        } elseif ($this->hasColumn('users', 'nama_lengkap')) {
            $query->orderBy('u.nama_lengkap');
        }

        return $query->select($select)->get()->map(fn($row) => [
            'id_user' => $this->rowValue($row, ['id_user']),
            'nama_lengkap' => (string) $this->rowValue($row, ['nama_lengkap', 'name'], ''),
            'email' => (string) $this->rowValue($row, ['email', 'email_kantor', 'email_akun'], ''),
            'nomor_telepon' => (string) $this->rowValue($row, ['nomor_telepon', 'nomor_tlp', 'no_hp', 'phone', 'telepon'], ''),
            'status' => (string) $this->rowValue($row, ['status'], 'aktif'),
            'id_posbankum' => $this->rowValue($row, ['id_posbankum']),
            'posbankum_nama' => (string) $this->rowValue($row, ['posbankum_nama'], ''),
            'id_kelurahan' => $this->rowValue($row, ['id_kelurahan']),
            'id_kecamatan' => $this->rowValue($row, ['id_kecamatan']),
            'id_kabupaten' => $this->rowValue($row, ['id_kabupaten']),
            'kelurahan_nama' => (string) $this->rowValue($row, ['kelurahan_nama'], ''),
            'kecamatan_nama' => (string) $this->rowValue($row, ['kecamatan_nama'], ''),
            'kabupaten_nama' => (string) $this->rowValue($row, ['kabupaten_nama'], ''),
            'assigned_at' => $this->rowValue($row, ['assigned_at', 'relasi_created_at', 'created_at']),
        ])->toArray();
    }

    private function laporanRows(): array
    {
        if (!$this->hasTable('kegiatan')) {
            return [];
        }

        $query = DB::table('kegiatan');

        foreach (['tgl_upload', 'created_at', 'updated_at', 'tgl_mulai'] as $orderColumn) {
            if ($this->hasColumn('kegiatan', $orderColumn)) {
                $query->orderByDesc($orderColumn);
                break;
            }
        }

        $rows = $query->limit(500)->get();

        $verifikatorColumn = $this->firstExistingColumn('kegiatan', [
            'id_user_verifikator',
            'verified_by',
            'verifikator_id',
        ]);

        $verificationDateColumn = $this->firstExistingColumn('kegiatan', [
            'tgl_verifikasi',
            'verified_at',
            'tanggal_verifikasi',
        ]);

        $posbankumIds = $rows
            ->map(fn($row) => $this->rowValue($row, ['id_posbankum', 'posbankum_id']))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $posbankumMap = [];
        $kelurahanMap = [];
        $kecamatanMap = [];
        $kabupatenMap = [];

        if (!empty($posbankumIds) && $this->hasTable('posbankum')) {
            $posIdColumn = $this->hasColumn('posbankum', 'id_posbankum') ? 'id_posbankum' : 'id';
            $posRows = DB::table('posbankum')
                ->whereIn($posIdColumn, $posbankumIds)
                ->get();

            foreach ($posRows as $pos) {
                $id = $this->rowValue($pos, [$posIdColumn, 'id_posbankum', 'id']);
                if ($id) {
                    $posbankumMap[$id] = $pos;
                }
            }

            $kelurahanIds = $posRows
                ->map(fn($row) => $this->rowValue($row, ['id_kelurahan']))
                ->filter()
                ->unique()
                ->values()
                ->all();

            $kecamatanIds = $posRows
                ->map(fn($row) => $this->rowValue($row, ['id_kecamatan']))
                ->filter()
                ->unique()
                ->values()
                ->all();

            $kabupatenIds = $posRows
                ->map(fn($row) => $this->rowValue($row, ['id_kabupaten']))
                ->filter()
                ->unique()
                ->values()
                ->all();

            if (!empty($kelurahanIds) && $this->hasTable('kelurahan')) {
                $key = $this->hasColumn('kelurahan', 'id_kelurahan') ? 'id_kelurahan' : 'id';
                $kelurahanMap = DB::table('kelurahan')
                    ->whereIn($key, $kelurahanIds)
                    ->get()
                    ->keyBy(fn($row) => $this->rowValue($row, [$key, 'id_kelurahan', 'id']))
                    ->toArray();

                $kecamatanIds = collect($kecamatanIds)
                    ->merge(collect($kelurahanMap)->map(fn($row) => $this->rowValue($row, ['id_kecamatan', 'kecamatan_id'])))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();
            }

            if (!empty($kecamatanIds) && $this->hasTable('kecamatan')) {
                $key = $this->hasColumn('kecamatan', 'id_kecamatan') ? 'id_kecamatan' : 'id';
                $kecamatanMap = DB::table('kecamatan')
                    ->whereIn($key, $kecamatanIds)
                    ->get()
                    ->keyBy(fn($row) => $this->rowValue($row, [$key, 'id_kecamatan', 'id']))
                    ->toArray();

                $kabupatenIds = collect($kabupatenIds)
                    ->merge(collect($kecamatanMap)->map(fn($row) => $this->rowValue($row, ['id_kabupaten', 'kabupaten_id'])))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();
            }

            if (!empty($kabupatenIds) && $this->hasTable('kabupaten')) {
                $key = $this->hasColumn('kabupaten', 'id_kabupaten') ? 'id_kabupaten' : 'id';
                $kabupatenMap = DB::table('kabupaten')
                    ->whereIn($key, $kabupatenIds)
                    ->get()
                    ->keyBy(fn($row) => $this->rowValue($row, [$key, 'id_kabupaten', 'id']))
                    ->toArray();
            }
        }

        $userIds = $rows
            ->flatMap(function ($row) use ($verifikatorColumn) {
                $ids = [
                    $this->rowValue($row, ['created_by', 'id_user', 'user_id']),
                ];

                if ($verifikatorColumn) {
                    $ids[] = $this->rowValue($row, [$verifikatorColumn]);
                }

                return array_filter($ids);
            })
            ->unique()
            ->values()
            ->all();

        $userMap = [];
        if (!empty($userIds) && $this->hasTable('users')) {
            $userKey = $this->hasColumn('users', 'id_user') ? 'id_user' : 'id';
            $userMap = DB::table('users')
                ->whereIn($userKey, $userIds)
                ->get()
                ->keyBy(fn($row) => $this->rowValue($row, [$userKey, 'id_user', 'id']))
                ->toArray();
        }

        $paralegalMap = [];
        if (!empty($posbankumIds) && $this->hasTable('users')) {
            $userPosColumn = $this->firstExistingColumn('users', ['id_posbankum', 'posbankum_id']);

            if ($userPosColumn) {
                $paralegalQuery = DB::table('users')->whereIn($userPosColumn, $posbankumIds);

                if ($this->hasColumn('users', 'role')) {
                    $paralegalQuery->where('role', 'paralegal');
                }

                if ($this->hasColumn('users', 'status')) {
                    $paralegalQuery->where('status', 'aktif');
                }

                $nameColumn = $this->firstExistingColumn('users', ['nama_lengkap', 'name', 'email']);
                if ($nameColumn) {
                    $paralegalQuery->orderBy($nameColumn);
                }

                foreach ($paralegalQuery->get() as $paralegal) {
                    $posId = $this->rowValue($paralegal, [$userPosColumn, 'id_posbankum', 'posbankum_id']);
                    $name = trim((string) $this->rowValue($paralegal, ['nama_lengkap', 'name', 'email'], ''));

                    if ($posId && $name !== '' && !isset($paralegalMap[$posId])) {
                        $paralegalMap[$posId] = $name;
                    }
                }
            }
        }

        return $rows->values()->map(function ($row, $index) use ($posbankumMap, $kelurahanMap, $kecamatanMap, $kabupatenMap, $userMap, $paralegalMap, $verifikatorColumn, $verificationDateColumn) {
            $id = $this->rowValue($row, ['id_kegiatan', 'id'], $index + 1);
            $idPosbankum = $this->rowValue($row, ['id_posbankum', 'posbankum_id']);
            $pos = $idPosbankum && isset($posbankumMap[$idPosbankum]) ? $posbankumMap[$idPosbankum] : null;

            $kelurahanId = $this->rowValue($pos, ['id_kelurahan']);
            $kelurahan = $kelurahanId && isset($kelurahanMap[$kelurahanId]) ? $kelurahanMap[$kelurahanId] : null;
            $kecamatanId = $this->rowValue($pos, ['id_kecamatan'], $this->rowValue($kelurahan, ['id_kecamatan', 'kecamatan_id']));
            $kecamatan = $kecamatanId && isset($kecamatanMap[$kecamatanId]) ? $kecamatanMap[$kecamatanId] : null;
            $kabupatenId = $this->rowValue($pos, ['id_kabupaten'], $this->rowValue($kecamatan, ['id_kabupaten', 'kabupaten_id']));
            $kabupaten = $kabupatenId && isset($kabupatenMap[$kabupatenId]) ? $kabupatenMap[$kabupatenId] : null;

            $createdBy = $this->rowValue($row, ['created_by', 'id_user', 'user_id']);
            $creator = $createdBy && isset($userMap[$createdBy]) ? $userMap[$createdBy] : null;
            $verifikatorId = $verifikatorColumn ? $this->rowValue($row, [$verifikatorColumn]) : null;
            $verifikator = $verifikatorId && isset($userMap[$verifikatorId]) ? $userMap[$verifikatorId] : null;
            $tanggalVerifikasi = $verificationDateColumn ? $this->rowValue($row, [$verificationDateColumn]) : null;

            $judul = (string) $this->rowValue($row, ['judul', 'nama_kegiatan', 'title', 'tema'], 'Kegiatan #' . ($index + 1));
            $deskripsi = (string) $this->rowValue($row, ['deskripsi', 'description', 'uraian', 'catatan'], '');
            $status = (string) $this->rowValue($row, ['status'], 'Menunggu');
            $thumbnail = (string) $this->rowValue($row, ['thumbnail_path', 'foto', 'gambar', 'dokumentasi', 'image_path'], '');
            $tglUpload = $this->rowValue($row, ['tgl_upload', 'created_at', 'updated_at'], null);
            $tglMulai = $this->rowValue($row, ['tgl_mulai', 'tanggal_kegiatan', 'tanggal'], $tglUpload);
            $anggotaTerlibat = $this->rowValue($row, ['anggota_terlibat', 'anggota', 'peserta_terlibat'], '');
            $creatorName = trim((string) $this->rowValue($creator, ['nama_lengkap', 'name', 'email'], ''));
            $anggotaName = $this->firstPersonName($anggotaTerlibat);
            $defaultParalegalName = $idPosbankum && isset($paralegalMap[$idPosbankum]) ? $paralegalMap[$idPosbankum] : '';
            $pelaporName = $creatorName ?: $anggotaName ?: $defaultParalegalName;

            return [
                'id' => $id,
                'id_kegiatan' => $id,
                'id_posbankum' => $idPosbankum,
                'judul' => $judul,
                'nama_kegiatan' => $judul,
                'deskripsi' => $deskripsi,
                'catatan' => (string) $this->rowValue($row, ['catatan', 'catatan_admin', 'alasan_penolakan'], ''),
                'hasil_kegiatan' => (string) $this->rowValue($row, ['hasil_kegiatan', 'hasil', 'output', 'result'], ''),
                'status' => $status,
                'tgl_verifikasi' => $tanggalVerifikasi,
                'id_user_verifikator' => $verifikatorId,
                'admin_penanggung_jawab' => (string) $this->rowValue($verifikator, ['nama_lengkap', 'name', 'email'], ''),
                'tgl_upload' => $tglUpload,
                'created_at' => $this->rowValue($row, ['created_at'], $tglUpload),
                'updated_at' => $this->rowValue($row, ['updated_at'], $tglUpload),
                'tgl_mulai' => $tglMulai,
                'tgl_selesai' => $this->rowValue($row, ['tgl_selesai', 'tanggal_selesai'], null),
                'thumbnail_path' => $thumbnail,
                'thumbnail_url' => $this->publicPreviewUrl($thumbnail),
                'gambar' => $thumbnail,
                'lokasi' => (string) $this->rowValue($row, ['lokasi', 'location', 'alamat', 'tempat'], ''),
                'jumlah_peserta' => (int) $this->rowValue($row, ['jumlah_peserta', 'participants', 'peserta', 'jml_peserta'], 0),
                'anggota_terlibat' => $anggotaTerlibat,
                'kategori' => (string) $this->rowValue($row, ['kategori', 'jenis_kegiatan'], ''),
                'pelapor' => $pelaporName,
                'posbankum_nama' => (string) $this->rowValue($pos, ['nama', 'name', 'nama_posbankum'], ''),
                'kecamatan_nama' => (string) $this->rowValue($kecamatan, ['nama', 'name'], ''),
                'kabupaten_nama' => (string) $this->rowValue($kabupaten, ['nama', 'name'], ''),
                'posbankum' => [
                    'nama' => (string) $this->rowValue($pos, ['nama', 'name', 'nama_posbankum'], ''),
                    'nama_paralegal' => $pelaporName,
                    'kelurahan' => [
                        'nama' => (string) $this->rowValue($kelurahan, ['nama', 'name'], ''),
                    ],
                    'kecamatan' => [
                        'nama' => (string) $this->rowValue($kecamatan, ['nama', 'name'], ''),
                    ],
                    'kabupaten' => [
                        'nama' => (string) $this->rowValue($kabupaten, ['nama', 'name'], ''),
                    ],
                ],
            ];
        })->toArray();
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
        $authorRoles = [];
        if (!empty($userIds) && $this->hasTable('users') && $this->hasColumn('users', 'id_user')) {
            $userSelect = collect(['id_user', 'nama_lengkap', 'name', 'email', 'role'])
                ->filter(fn($column) => $this->hasColumn('users', $column))
                ->values()
                ->all();

            DB::table('users')
                ->select($userSelect)
                ->whereIn('id_user', $userIds)
                ->get()
                ->each(function ($user) use (&$authors, &$authorRoles) {
                    $id = $this->rowValue($user, ['id_user']);
                    if (!$id) {
                        return;
                    }

                    $role = strtolower(trim((string) $this->rowValue($user, ['role'], '')));
                    $authorRoles[$id] = $role;
                    $authors[$id] = $role === 'admin'
                        ? 'admin'
                        : (string) $this->rowValue($user, ['nama_lengkap', 'name', 'email'], 'Admin');
                });
        }

        return $rows->values()->map(function ($row, $index) use ($authors, $authorRoles) {
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
                'imageUrl' => $this->publicPreviewUrl($image),
                'tgl_publish' => $publishedAt,
                'date' => $publishedAt,
                'kategori' => $category,
                'category' => $category,
                'authorName' => $authors[$userId] ?? 'Admin',
                'author' => $authors[$userId] ?? 'Admin',
                'authorRole' => $authorRoles[$userId] ?? '',
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
            'laporanRows' => $this->laporanRows(),
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

        if ($this->hasColumn('posbankum_paralegal', 'id_user') && $this->hasColumn('posbankum_paralegal', 'id_posbankum')) {
            $userId = $user->id_user ?? $user->id ?? null;

            if ($userId) {
                $query = DB::table('posbankum_paralegal')->where('id_user', $userId);

                if ($this->hasColumn('posbankum_paralegal', 'status')) {
                    $query->where('status', 'aktif');
                }

                $found = $query->value('id_posbankum');

                if ($found) {
                    return $found;
                }
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

        $query = $this->applyPengaduanPosbankumFilter($query, $idPosbankum);

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

        if ($this->hasColumn('posbankum_paralegal', 'id_posbankum')) {
            $query = DB::table('posbankum_paralegal')->where('id_posbankum', $idPosbankum);

            if ($this->hasColumn('posbankum_paralegal', 'status')) {
                $query->where('status', 'aktif');
            }

            return $query->count();
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
