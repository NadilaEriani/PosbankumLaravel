<?php

namespace App\Http\Controllers\Paralegal;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
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

    private function canFilterPengaduanViaParalegal(): bool
    {
        return $this->hasTable('posbankum_paralegal')
            && $this->hasColumn('posbankum_paralegal', 'id_user')
            && $this->hasColumn('posbankum_paralegal', 'id_posbankum')
            && $this->hasColumn('pengaduan', 'user_id');
    }

    private function canFilterPengaduanViaMasyarakat(): bool
    {
        return $this->hasTable('masyarakat')
            && $this->hasTable('posbankum')
            && $this->hasColumn('masyarakat', 'id_user')
            && $this->hasColumn('masyarakat', 'id_kelurahan')
            && $this->hasColumn('posbankum', 'id_kelurahan')
            && $this->hasColumn('pengaduan', 'user_id');
    }

    private function applyPengaduanPosbankumFilter($query, mixed $idPosbankum)
    {
        if (!$idPosbankum) {
            return $query;
        }

        if ($this->hasColumn('pengaduan', 'id_posbankum')) {
            return $query->where('id_posbankum', $idPosbankum);
        }

        return $query->where(function ($subQuery) use ($idPosbankum) {
            if ($this->canFilterPengaduanViaParalegal()) {
                $subQuery->whereExists(function ($exists) use ($idPosbankum) {
                    $exists->selectRaw('1')
                        ->from('posbankum_paralegal as pp')
                        ->whereColumn('pp.id_user', 'pengaduan.user_id')
                        ->where('pp.id_posbankum', $idPosbankum);

                    if ($this->hasColumn('posbankum_paralegal', 'status')) {
                        $exists->where('pp.status', 'aktif');
                    }
                });
            }

            if ($this->canFilterPengaduanViaMasyarakat()) {
                $method = $this->canFilterPengaduanViaParalegal() ? 'orWhereExists' : 'whereExists';
                $subQuery->{$method}(function ($exists) use ($idPosbankum) {
                    $exists->selectRaw('1')
                        ->from('masyarakat as m')
                        ->join('posbankum as pb', 'pb.id_kelurahan', '=', 'm.id_kelurahan')
                        ->whereColumn('m.id_user', 'pengaduan.user_id')
                        ->where('pb.id_posbankum', $idPosbankum);
                });
            }
        });
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

    private function normalizeAreaText(mixed $value): string
    {
        $text = Str::lower(Str::ascii(trim((string) ($value ?? ''))));
        $text = preg_replace('/\b(kelurahan|kel|desa|kecamatan|kec|kabupaten|kab|kota|provinsi)\b/u', ' ', $text);
        $text = preg_replace('/[^a-z0-9]+/u', ' ', (string) $text);
        return trim(preg_replace('/\s+/u', ' ', (string) $text));
    }

    private function areaTextContains(mixed $haystack, mixed $needle): bool
    {
        $cleanHaystack = $this->normalizeAreaText($haystack);
        $cleanNeedle = $this->normalizeAreaText($needle);

        if ($cleanNeedle === '') {
            return true;
        }

        return str_contains(' ' . $cleanHaystack . ' ', ' ' . $cleanNeedle . ' ');
    }

    private function resolvePosbankumAreaContext(mixed $idPosbankum): array
    {
        if (!$idPosbankum || !$this->hasTable('posbankum')) {
            return [];
        }

        $idColumn = $this->hasColumn('posbankum', 'id_posbankum') ? 'id_posbankum' : 'id';
        $row = DB::table('posbankum')->where($idColumn, $idPosbankum)->first();

        if (!$row) {
            return [];
        }

        $idKelurahan = $this->rowValue($row, ['id_kelurahan']);
        $kelurahan = null;
        $kecamatan = null;
        $kabupaten = null;

        if ($idKelurahan && $this->hasTable('kelurahan')) {
            $kelurahan = DB::table('kelurahan')->where('id_kelurahan', $idKelurahan)->first();
        }

        $idKecamatan = $this->rowValue($kelurahan, ['id_kecamatan']);
        if ($idKecamatan && $this->hasTable('kecamatan')) {
            $kecamatan = DB::table('kecamatan')->where('id_kecamatan', $idKecamatan)->first();
        }

        $idKabupaten = $this->rowValue($kecamatan, ['id_kabupaten']);
        if ($idKabupaten && $this->hasTable('kabupaten')) {
            $kabupaten = DB::table('kabupaten')->where('id_kabupaten', $idKabupaten)->first();
        }

        return [
            'latitude' => $this->rowValue($row, ['latitude', 'lat', 'latitude_pos', 'lat_pos', 'lattitude']),
            'longitude' => $this->rowValue($row, ['longitude', 'lng', 'long', 'longitude_pos', 'lng_pos', 'long_pos']),
            'kelurahan' => (string) $this->rowValue($kelurahan, ['nama'], ''),
            'kecamatan' => (string) $this->rowValue($kecamatan, ['nama'], ''),
            'kabupaten' => (string) $this->rowValue($kabupaten, ['nama'], ''),
        ];
    }

    private function reverseGeocode(float $latitude, float $longitude): ?array
    {
        try {
            $response = Http::timeout(10)
                ->retry(1, 250)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Accept-Language' => 'id-ID,id;q=0.9',
                    'User-Agent' => (string) config('app.name', 'Posbankum') . ' Location Validation',
                ])
                ->get('https://nominatim.openstreetmap.org/reverse', [
                    'format' => 'jsonv2',
                    'addressdetails' => 1,
                    'zoom' => 18,
                    'lat' => $latitude,
                    'lon' => $longitude,
                ]);

            if (!$response->successful()) {
                return null;
            }

            $json = $response->json();
            return is_array($json) ? $json : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function locationMatchesPosbankumArea(array $area, array $selectedGeocode): bool
    {
        $selectedAddress = is_array($selectedGeocode['address'] ?? null)
            ? implode(' ', array_values($selectedGeocode['address']))
            : '';
        $selectedText = trim((string) ($selectedGeocode['display_name'] ?? '') . ' ' . $selectedAddress);

        $expected = array_values(array_filter([
            $area['kelurahan'] ?? '',
            $area['kecamatan'] ?? '',
            $area['kabupaten'] ?? '',
        ], fn($value) => trim((string) $value) !== ''));

        if (!empty($expected)) {
            foreach ($expected as $name) {
                if (!$this->areaTextContains($selectedText, $name)) {
                    return false;
                }
            }

            return true;
        }

        $baseLatitude = (float) ($area['latitude'] ?? 0);
        $baseLongitude = (float) ($area['longitude'] ?? 0);
        $baseGeocode = $this->reverseGeocode($baseLatitude, $baseLongitude);

        if (!$baseGeocode) {
            return false;
        }

        $baseAddress = is_array($baseGeocode['address'] ?? null) ? $baseGeocode['address'] : [];
        $fallbackAreaNames = [
            $this->rowValue($baseAddress, ['village', 'suburb', 'quarter', 'neighbourhood', 'hamlet']),
            $this->rowValue($baseAddress, ['city_district', 'district', 'municipality']),
            $this->rowValue($baseAddress, ['city', 'town', 'county']),
        ];
        $fallbackAreaNames = array_values(array_filter($fallbackAreaNames, fn($value) => trim((string) $value) !== ''));

        if (empty($fallbackAreaNames)) {
            return false;
        }

        foreach ($fallbackAreaNames as $name) {
            if (!$this->areaTextContains($selectedText, $name)) {
                return false;
            }
        }

        return true;
    }

    private function validateIncidentLocationArea(mixed $idPosbankum, float $latitude, float $longitude): void
    {
        $area = $this->resolvePosbankumAreaContext($idPosbankum);
        $taggingLatitude = filter_var($area['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
        $taggingLongitude = filter_var($area['longitude'] ?? null, FILTER_VALIDATE_FLOAT);

        if (
            $taggingLatitude === false ||
            $taggingLongitude === false ||
            $taggingLatitude < -90 ||
            $taggingLatitude > 90 ||
            $taggingLongitude < -180 ||
            $taggingLongitude > 180
        ) {
            throw ValidationException::withMessages([
                'lokasi_kejadian' => 'Tagging Area Posbankum belum diatur. Atur lokasi Posbankum terlebih dahulu.',
            ]);
        }

        $selectedGeocode = $this->reverseGeocode($latitude, $longitude);
        if (!$selectedGeocode || trim((string) ($selectedGeocode['display_name'] ?? '')) === '') {
            throw ValidationException::withMessages([
                'lokasi_kejadian' => 'Lokasi kejadian tidak dapat diverifikasi saat ini. Periksa koneksi layanan peta lalu coba lagi.',
            ]);
        }

        if (!$this->locationMatchesPosbankumArea($area, $selectedGeocode)) {
            throw ValidationException::withMessages([
                'lokasi_kejadian' => 'Lokasi berada di luar tagging area Posbankum. Pilih lokasi yang masih berada di wilayah Posbankum Anda.',
            ]);
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

            $query = $this->applyPengaduanPosbankumFilter($query, $idPosbankum);

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

        $mode = (string) $request->input('update_mode', 'append');
        $nextProgress = (int) $request->input('progress', $old['progress'] ?? 0);
        $nextProgress = max(0, min(100, $nextProgress));

        if ($status === 'selesai') {
            $nextProgress = 100;
        }

        $title = $request->input('progress_title');
        $desc = $request->input('progress_desc');

        if ($mode === 'reset' || empty($updates)) {
            $updates = [];
        }

        if ($request->boolean('append_update', true)) {
            $updates[] = [
                'title' => $title ?: ($status === 'selesai' ? 'Kasus Selesai' : (empty($old) ? 'Laporan Diterima' : 'Update Status')),
                'date' => now()->locale('id')->translatedFormat('j F Y'),
                'time' => now()->format('H:i'),
                'desc' => $desc ?: ($status === 'selesai'
                    ? 'Laporan ditandai selesai oleh Posbankum.'
                    : (empty($old)
                        ? 'Laporan berhasil dibuat dan masuk ke antrian pemeriksaan awal.'
                        : 'Progres penanganan laporan diperbarui.')),
                'by' => $request->user()->nama_lengkap ?? $request->user()->name ?? 'Admin Posbankum',
            ];
        }

        return json_encode([
            'nik' => $this->digitsOnly($request->input('nik')),
            'nama_lurah' => $request->input('nama_lurah'),
            'prioritas' => $request->input('prioritas', $old['prioritas'] ?? 'sedang'),
            'id_paralegal' => $request->input('id_paralegal', $old['id_paralegal'] ?? ''),
            'paralegal_nama' => $request->input('paralegal_nama', $old['paralegal_nama'] ?? ''),
            'paralegal_hp' => $request->input('paralegal_hp', $old['paralegal_hp'] ?? ''),
            'catatan_internal' => $request->input('catatan_internal', $old['catatan_internal'] ?? ''),
            'progress' => $nextProgress,
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
            'nama_lurah' => ['nullable', 'string', 'max:255'],
            'jenis_masalah' => ['required', 'string', 'max:120'],
            'prioritas' => ['required', 'in:tinggi,sedang,rendah'],
            'judul_pengaduan' => ['required', 'string', 'max:100'],
            'kronologi' => ['required', 'string'],
            'tanggal_kejadian' => ['required', 'date'],
            'waktu_kejadian' => ['required', 'date_format:H:i'],
            'lokasi_kejadian' => ['required', 'string', 'max:255'],
            'latitude_kejadian' => ['required', 'numeric', 'between:-90,90'],
            'longitude_kejadian' => ['required', 'numeric', 'between:-180,180'],
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
            'lokasi_kejadian.required' => 'Lokasi kejadian wajib dipilih melalui maps.',
            'latitude_kejadian.required' => 'Koordinat latitude lokasi kejadian wajib dipilih melalui maps.',
            'latitude_kejadian.between' => 'Koordinat latitude lokasi kejadian tidak valid.',
            'longitude_kejadian.required' => 'Koordinat longitude lokasi kejadian wajib dipilih melalui maps.',
            'longitude_kejadian.between' => 'Koordinat longitude lokasi kejadian tidak valid.',
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

        $latitudeKejadian = (float) $validated['latitude_kejadian'];
        $longitudeKejadian = (float) $validated['longitude_kejadian'];
        $this->validateIncidentLocationArea($idPosbankum, $latitudeKejadian, $longitudeKejadian);

        $latitudeColumn = $this->firstExistingColumn('pengaduan', [
            'latitude_kejadian',
            'lat_kejadian',
            'lokasi_lat',
            'latitude',
            'lat',
        ]);
        $longitudeColumn = $this->firstExistingColumn('pengaduan', [
            'longitude_kejadian',
            'lng_kejadian',
            'lokasi_lng',
            'longitude',
            'lng',
            'long',
        ]);

        if (!$latitudeColumn || !$longitudeColumn) {
            throw ValidationException::withMessages([
                'database' => 'Kolom koordinat lokasi kejadian belum tersedia. Jalankan migration terbaru terlebih dahulu.',
            ]);
        }

        $payload = [];
        $idPengaduan = $this->makePengaduanPrimaryKey($payload);
        $assignedUserId = $this->blankToNull($validated['id_paralegal'] ?? null) ?: $createdBy;
        $this->addColumn($payload, 'pengaduan', 'user_id', $assignedUserId);
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
        $payload[$latitudeColumn] = $latitudeKejadian;
        $payload[$longitudeColumn] = $longitudeKejadian;
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
            'progress' => ['nullable', 'integer', 'min:0', 'max:100'],
            'progress_title' => ['nullable', 'string', 'max:120'],
            'progress_desc' => ['nullable', 'string'],
            'append_update' => ['nullable', 'boolean'],
            'update_mode' => ['nullable', 'in:append,reset'],
        ]);

        $idColumn = $this->pengaduanKeyColumn();
        $row = DB::table('pengaduan')->where($idColumn, $id)->first();

        if (!$row) {
            abort(404);
        }

        $oldCatatan = $this->parseCatatanAdmin($this->rowValue($row, ['catatan_admin'], '{}'));
        $request->merge([
            'prioritas' => $oldCatatan['prioritas'] ?? $this->rowValue($row, ['prioritas'], 'sedang'),
            'id_paralegal' => $oldCatatan['id_paralegal'] ?? $this->rowValue($row, ['id_paralegal', 'user_id'], ''),
            'paralegal_nama' => $oldCatatan['paralegal_nama'] ?? '',
            'paralegal_hp' => $oldCatatan['paralegal_hp'] ?? '',
            'catatan_internal' => $request->input('catatan_internal', $oldCatatan['catatan_internal'] ?? ''),
            'nik' => $oldCatatan['nik'] ?? '',
            'nama_lurah' => $oldCatatan['nama_lurah'] ?? '',
            'progress' => $validated['status'] === 'selesai'
                ? 100
                : (int) ($validated['progress'] ?? ($oldCatatan['progress'] ?? 0)),
            'progress_title' => $validated['progress_title'] ?? null,
            'progress_desc' => $validated['progress_desc'] ?? null,
            'append_update' => $request->has('append_update') ? $request->boolean('append_update') : true,
            'update_mode' => $validated['update_mode'] ?? 'append',
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
