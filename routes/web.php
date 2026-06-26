<?php

use App\Http\Controllers\Admin\KelolaBeritaController;
use App\Http\Controllers\Admin\LaporanKegiatanController;
use App\Http\Controllers\Admin\ManajemenAkunController;
use App\Http\Controllers\Admin\VerifikasiDataPosbankumController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Paralegal\DashboardController as ParalegalDashboardController;
use App\Http\Controllers\Paralegal\KelolaKegiatanController;
use App\Http\Controllers\Paralegal\KelolaPosbankumController;
use App\Http\Controllers\Paralegal\LaporanPelayananController;
use App\Http\Controllers\Paralegal\ProfileController as ParalegalProfileController;
use App\Http\Controllers\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

Route::get('/', function () {
    $posbankums = [];

    if (Schema::hasTable('posbankum')) {
        $query = DB::table('posbankum as p');

        if (Schema::hasTable('kelurahan') && Schema::hasColumn('posbankum', 'id_kelurahan')) {
            $query->leftJoin('kelurahan as kel', 'kel.id_kelurahan', '=', 'p.id_kelurahan');
        }

        if (
            Schema::hasTable('kecamatan') &&
            Schema::hasTable('kelurahan') &&
            Schema::hasColumn('kelurahan', 'id_kecamatan')
        ) {
            $query->leftJoin('kecamatan as kec', 'kec.id_kecamatan', '=', 'kel.id_kecamatan');
        }

        if (
            Schema::hasTable('kabupaten') &&
            Schema::hasTable('kecamatan') &&
            Schema::hasColumn('kecamatan', 'id_kabupaten')
        ) {
            $query->leftJoin('kabupaten as kab', 'kab.id_kabupaten', '=', 'kec.id_kabupaten');
        }

        $rows = $query
            ->select([
                'p.*',
                DB::raw('COALESCE(kel.nama, "") as kelurahan_nama'),
                DB::raw('COALESCE(kec.nama, "") as kecamatan_nama'),
                DB::raw('COALESCE(kab.nama, "") as kabupaten_nama'),
            ])
            ->orderBy('p.nama')
            ->get();

        $ids = $rows
            ->pluck('id_posbankum')
            ->filter()
            ->values();

        $paralegalCounts = [];

        if (Schema::hasTable('posbankum_paralegal') && Schema::hasColumn('posbankum_paralegal', 'id_posbankum')) {
            $paralegalQuery = DB::table('posbankum_paralegal')
                ->select('id_posbankum', DB::raw('COUNT(*) as total'))
                ->whereIn('id_posbankum', $ids);

            if (Schema::hasColumn('posbankum_paralegal', 'status')) {
                $paralegalQuery->where('status', 'aktif');
            }

            $paralegalCounts = $paralegalQuery
                ->groupBy('id_posbankum')
                ->pluck('total', 'id_posbankum')
                ->toArray();
        }

        $paralegalContacts = [];

        if (
            $ids->isNotEmpty() &&
            Schema::hasTable('posbankum_paralegal') &&
            Schema::hasTable('users') &&
            Schema::hasColumn('posbankum_paralegal', 'id_posbankum') &&
            Schema::hasColumn('posbankum_paralegal', 'id_user')
        ) {
            $userKeyColumn = Schema::hasColumn('users', 'id_user') ? 'id_user' : 'id';

            if (Schema::hasColumn('users', $userKeyColumn)) {
                $phoneColumns = array_values(array_filter(
                    ['nomor_telepon', 'nomor_tlp', 'no_hp', 'phone', 'telepon'],
                    fn($column) => Schema::hasColumn('users', $column)
                ));
                $emailColumns = array_values(array_filter(
                    ['email', 'email_kantor', 'email_akun'],
                    fn($column) => Schema::hasColumn('users', $column)
                ));
                $selectColumns = ['pp.id_posbankum'];

                foreach (array_merge($phoneColumns, $emailColumns) as $column) {
                    $selectColumns[] = 'u.' . $column . ' as ' . $column;
                }

                $contactQuery = DB::table('posbankum_paralegal as pp')
                    ->join('users as u', 'u.' . $userKeyColumn, '=', 'pp.id_user')
                    ->whereIn('pp.id_posbankum', $ids);

                if (Schema::hasColumn('posbankum_paralegal', 'status')) {
                    $contactQuery->where('pp.status', 'aktif');
                }

                if (Schema::hasColumn('users', 'role')) {
                    $contactQuery->where('u.role', 'paralegal');
                }

                if (Schema::hasColumn('users', 'status')) {
                    $contactQuery->where('u.status', 'aktif');
                }

                if (Schema::hasColumn('posbankum_paralegal', 'is_primary')) {
                    $contactQuery->orderByDesc('pp.is_primary');
                }

                foreach (['assigned_at', 'created_at'] as $column) {
                    if (Schema::hasColumn('posbankum_paralegal', $column)) {
                        $contactQuery->orderBy('pp.' . $column);
                    }
                }

                if (Schema::hasColumn('users', 'created_at')) {
                    $contactQuery->orderBy('u.created_at');
                }

                $contactQuery
                    ->select($selectColumns)
                    ->get()
                    ->each(function ($row) use (&$paralegalContacts, $phoneColumns, $emailColumns) {
                        $idPosbankum = (string) ($row->id_posbankum ?? '');

                        if ($idPosbankum === '' || isset($paralegalContacts[$idPosbankum])) {
                            return;
                        }

                        $phone = '-';
                        $email = '-';

                        foreach ($phoneColumns as $column) {
                            $value = trim((string) ($row->{$column} ?? ''));

                            if ($value !== '' && $value !== '-') {
                                $phone = $value;
                                break;
                            }
                        }

                        foreach ($emailColumns as $column) {
                            $value = trim((string) ($row->{$column} ?? ''));

                            if ($value !== '' && $value !== '-') {
                                $email = $value;
                                break;
                            }
                        }

                        $paralegalContacts[$idPosbankum] = [
                            'phone' => $phone,
                            'email' => $email,
                        ];
                    });
            }
        }

        $caseCounts = [];

        if (
            Schema::hasTable('pengaduan') &&
            Schema::hasColumn('pengaduan', 'id_posbankum')
        ) {
            $caseCounts = DB::table('pengaduan')
                ->select('id_posbankum', DB::raw('COUNT(*) as total'))
                ->whereIn('id_posbankum', $ids)
                ->groupBy('id_posbankum')
                ->pluck('total', 'id_posbankum')
                ->toArray();
        }

        $cleanContact = function (...$values): string {
            foreach ($values as $value) {
                $clean = trim((string) ($value ?? ''));

                if ($clean !== '' && $clean !== '-') {
                    return $clean;
                }
            }

            return '-';
        };

        $posbankums = $rows
            ->map(function ($row) use ($paralegalCounts, $caseCounts, $paralegalContacts, $cleanContact) {
                $idPosbankum = $row->id_posbankum ?? null;
                $statusTagging = strtolower((string) ($row->status_verifikasi_tagging_area ?? ''));
                $paralegalContact = $paralegalContacts[(string) $idPosbankum] ?? [];
                $phone = $cleanContact(
                    $row->nomor_tlp ?? null,
                    $row->nomor_telepon ?? null,
                    $row->phone ?? null,
                    $row->telepon ?? null,
                    $paralegalContact['phone'] ?? null
                );
                $email = $cleanContact(
                    $row->email_akun ?? null,
                    $row->email ?? null,
                    $row->email_posbankum ?? null,
                    $paralegalContact['email'] ?? null
                );

                return [
                    'id' => $idPosbankum,
                    'id_posbankum' => $idPosbankum,
                    'name' => $row->nama,
                    'nama' => $row->nama,
                    'address' => $row->alamat ?: trim(implode(', ', array_filter([
                        $row->kelurahan_nama ?? '',
                        $row->kecamatan_nama ?? '',
                        $row->kabupaten_nama ?? '',
                    ]))),
                    'alamat' => $row->alamat,
                    'phone' => $phone,
                    'nomor_tlp' => $phone,
                    'email' => $email,
                    'email_akun' => $email,
                    'district' => $row->kecamatan_nama ?? '',
                    'kelurahan_nama' => $row->kelurahan_nama ?? '',
                    'kecamatan_nama' => $row->kecamatan_nama ?? '',
                    'kabupaten_nama' => $row->kabupaten_nama ?? '',
                    'region' => trim(implode(', ', array_filter([
                        $row->kelurahan_nama ?? '',
                        $row->kecamatan_nama ?? '',
                        $row->kabupaten_nama ?? '',
                    ]))),
                    'latitude' => $row->latitude ?? null,
                    'longitude' => $row->longitude ?? null,
                    'status_verifikasi_tagging_area' => $row->status_verifikasi_tagging_area ?? null,
                    'status' => $statusTagging === 'ditolak'
                        ? 'Ditolak'
                        : ($statusTagging === 'menunggu' ? 'Menunggu' : 'Aktif'),
                    'paralegalCount' => (int) ($paralegalCounts[$idPosbankum] ?? 0),
                    'caseCount' => (int) ($caseCounts[$idPosbankum] ?? 0),
                    'operationalHours' => 'Senin - Jumat, 08:00 - 16:00 WIB',
                ];
            })
            ->values()
            ->toArray();
    }

    return Inertia::render('LandingPage', [
        'posbankums' => $posbankums,
    ]);
})->name('home');

/* Google Login */
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])
    ->name('google.redirect');

Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])
    ->name('google.callback');

Route::get('/dashboard', function () {
    $user = Auth::user();
    $role = $user ? strtolower(trim((string) $user->role)) : null;

    if ($role === 'admin') {
        return redirect()->route('admin.dashboard');
    }

    if ($role === 'paralegal' || $role === 'posbankum') {
        return redirect()->route('paralegal.dashboard');
    }

    return redirect()->route('home');
})->middleware(['auth'])->name('dashboard');

$streamPublicFile = static function (Request $request, ?string $path = null) {
    $rawPath = $path !== null ? $path : (string) $request->query('path', '');
    $rawPath = rawurldecode(str_replace('\\', '/', trim((string) $rawPath)));

    if ($rawPath === '') {
        abort(404, 'Berkas tidak ditemukan.');
    }

    if (preg_match('/^https?:\/\//i', $rawPath)) {
        $urlPath = parse_url($rawPath, PHP_URL_PATH) ?: '';
        $rawPath = $urlPath;
    }

    $cleanPath = strtok($rawPath, '?#');
    $cleanPath = $cleanPath === false ? $rawPath : $cleanPath;
    $cleanPath = preg_replace('#^/+#', '', $cleanPath);
    $cleanPath = preg_replace('#^(storage|public|app/public)/#i', '', $cleanPath);
    $cleanPath = ltrim(str_replace('\\', '/', (string) $cleanPath), '/');

    if ($cleanPath === '' || str_contains($cleanPath, "\0") || str_contains($cleanPath, '..')) {
        abort(403, 'Path berkas tidak valid.');
    }

    $candidateRoots = array_values(array_unique(array_filter([
        storage_path('app/public'),
        public_path('storage'),
        public_path(),
    ])));

    $realPath = null;

    foreach ($candidateRoots as $root) {
        $root = rtrim((string) $root, DIRECTORY_SEPARATOR . '/\\');
        $candidate = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $cleanPath);
        $realRoot = realpath($root);
        $candidateRealPath = realpath($candidate);

        if (!$realRoot || !$candidateRealPath || !is_file($candidateRealPath)) {
            continue;
        }

        $normalizedRoot = rtrim(str_replace('\\', '/', $realRoot), '/') . '/';
        $normalizedPath = str_replace('\\', '/', $candidateRealPath);

        if (str_starts_with($normalizedPath, $normalizedRoot)) {
            $realPath = $candidateRealPath;
            break;
        }
    }

    if (!$realPath) {
        abort(404, 'Berkas tidak ditemukan.');
    }

    $mime = function_exists('mime_content_type') ? mime_content_type($realPath) : false;
    $fileName = trim((string) $request->query('name', basename($realPath)));
    $fileName = str_replace(['"', "\r", "\n"], '', $fileName) ?: basename($realPath);
    $disposition = $request->boolean('download') ? 'attachment' : 'inline';

    return response()->file($realPath, [
        'Content-Type' => $mime ?: 'application/octet-stream',
        'Content-Disposition' => $disposition . '; filename="' . addcslashes($fileName, '"\\') . '"',
        'Cache-Control' => 'private, max-age=0, must-revalidate',
        'X-Content-Type-Options' => 'nosniff',
    ]);
};

Route::middleware(['auth'])->group(function () use ($streamPublicFile) {
    Route::get('/file-preview', $streamPublicFile)->name('file.preview');

    Route::get('/storage/{path}', $streamPublicFile)
        ->where('path', '.*')
        ->name('storage.inline');

    /* Admin Dashboard */
    Route::get('/admin', [AdminDashboardController::class, 'admin'])
        ->name('admin.dashboard');

    Route::get('/admin/aktivitas-terbaru', [AdminDashboardController::class, 'admin'])
        ->name('admin.aktivitas-terbaru.page');

    /* Admin Menu */
    Route::get('/admin/kelola-berita/{mode?}/{id?}', [AdminDashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.kelola-berita.page');

    Route::post('/admin/kelola-berita', [KelolaBeritaController::class, 'store'])
        ->name('admin.kelola-berita.store');

    Route::put('/admin/kelola-berita/{id}', [KelolaBeritaController::class, 'update'])
        ->name('admin.kelola-berita.update');

    Route::delete('/admin/kelola-berita/{id}', [KelolaBeritaController::class, 'destroy'])
        ->name('admin.kelola-berita.destroy');

    Route::get('/admin/data-posbankum/{mode?}/{id?}', [AdminDashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.data-posbankum.page');

    Route::get('/admin/verifikasi-data-posbankum/{mode?}/{id?}', [AdminDashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.verifikasi-data-posbankum.page');

    Route::get('/admin/laporan-kegiatan/{mode?}/{id?}', [AdminDashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.laporan-kegiatan.page');

    Route::patch('/admin/laporan-kegiatan/{idKegiatan}/status', [LaporanKegiatanController::class, 'updateStatus'])
        ->name('admin.laporan-kegiatan.status');

    Route::get('/admin/manajemen-akun/{mode?}/{id?}', [AdminDashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.manajemen-akun.page');

    /* Manajemen Akun */
    Route::post('/admin/manajemen-akun/paralegal', [ManajemenAkunController::class, 'store'])
        ->name('admin.manajemen-akun.paralegal.store');

    Route::put('/admin/manajemen-akun/paralegal/{idUser}', [ManajemenAkunController::class, 'update'])
        ->name('admin.manajemen-akun.paralegal.update');

    Route::delete('/admin/manajemen-akun/paralegal/{idUser}', [ManajemenAkunController::class, 'destroy'])
        ->name('admin.manajemen-akun.paralegal.destroy');

    /* Verifikasi Data Posbankum */
    Route::get('/admin/verifikasi-data-posbankum/dokumen/{id}/preview', [VerifikasiDataPosbankumController::class, 'previewDokumen'])
        ->name('admin.verifikasi-data-posbankum.dokumen.preview');

    Route::get('/admin/verifikasi-data-posbankum/dokumen-preview', [VerifikasiDataPosbankumController::class, 'previewDokumenPath'])
        ->name('admin.verifikasi-data-posbankum.dokumen.preview-path');

    Route::patch('/admin/verifikasi-data-posbankum/dokumen-status-by-path', [VerifikasiDataPosbankumController::class, 'updateDokumenStatusByPath'])
        ->name('admin.verifikasi-data-posbankum.dokumen.status-by-path');

    Route::patch('/admin/verifikasi-data-posbankum/dokumen/{id}/status', [VerifikasiDataPosbankumController::class, 'updateDokumenStatus'])
        ->name('admin.verifikasi-data-posbankum.dokumen.status');

    Route::patch('/admin/verifikasi-data-posbankum/tagging/{idPosbankum}/status', [VerifikasiDataPosbankumController::class, 'updateTaggingStatus'])
        ->name('admin.verifikasi-data-posbankum.tagging.status');

    Route::patch('/admin/verifikasi-data-posbankum/tagging/{idPosbankum}/location', [VerifikasiDataPosbankumController::class, 'updateTaggingLocation'])
        ->name('admin.verifikasi-data-posbankum.tagging.location');

    /* Dashboard Paralegal */
    Route::get('/paralegal', [ParalegalDashboardController::class, 'paralegal'])
        ->name('paralegal.dashboard');

    Route::get('/posbankum', [ParalegalDashboardController::class, 'posbankum'])
        ->name('posbankum.dashboard');

    Route::patch('/paralegal/notifikasi/{id}/read', [ParalegalDashboardController::class, 'updateNotificationRead'])
        ->name('paralegal.notifikasi.read');

    Route::patch('/paralegal/notifikasi/read-all', [ParalegalDashboardController::class, 'markAllNotificationsRead'])
        ->name('paralegal.notifikasi.read-all');

    Route::put('/paralegal/profile', [ParalegalProfileController::class, 'update'])
        ->name('paralegal.profile.update');

    Route::post('/paralegal/kelola-kegiatan', [KelolaKegiatanController::class, 'store'])
        ->name('paralegal.kelola-kegiatan.store');

    Route::put('/paralegal/kelola-kegiatan/{id}', [KelolaKegiatanController::class, 'update'])
        ->name('paralegal.kelola-kegiatan.update');

    Route::delete('/paralegal/kelola-kegiatan/{id}', [KelolaKegiatanController::class, 'destroy'])
        ->name('paralegal.kelola-kegiatan.destroy');

    Route::patch('/paralegal/kelola-posbankum/lokasi', [KelolaPosbankumController::class, 'updateLocation'])
        ->name('paralegal.kelola-posbankum.lokasi');

    Route::post('/paralegal/kelola-posbankum/dokumen', [KelolaPosbankumController::class, 'storeDocument'])
        ->name('paralegal.kelola-posbankum.dokumen.store');

    Route::delete('/paralegal/kelola-posbankum/dokumen/{id}', [KelolaPosbankumController::class, 'destroyDocument'])
        ->name('paralegal.kelola-posbankum.dokumen.destroy');

    Route::post('/paralegal/laporan-pelayanan', [LaporanPelayananController::class, 'store'])
        ->name('paralegal.laporan-pelayanan.store');

    Route::patch('/paralegal/laporan-pelayanan/{id}/status', [LaporanPelayananController::class, 'updateStatus'])
        ->name('paralegal.laporan-pelayanan.status');

    Route::delete('/paralegal/laporan-pelayanan/{id}', [LaporanPelayananController::class, 'destroy'])
        ->name('paralegal.laporan-pelayanan.destroy');

    /* Profile Admin */
    Route::get('/admin/profile', [AdminDashboardController::class, 'admin'])
        ->name('admin.profile.page');

    Route::post('/admin/profile', function (Request $request) {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        $userKeyColumn = Schema::hasColumn('users', 'id_user') ? 'id_user' : 'id';
        $userKey = $user->{$userKeyColumn}
            ?? $user->id_user
            ?? $user->id
            ?? $user->getKey();

        $data = $request->validate(
            [
                'full_name' => ['required', 'string', 'min:3', 'max:255'],
                'nip' => ['nullable', 'string', 'max:50'],
                'email_kantor' => [
                    'required',
                    'email',
                    'max:255',
                    Rule::unique('users', 'email')->ignore($userKey, $userKeyColumn),
                ],
                'nomor_telepon' => ['nullable', 'string', 'max:25'],
                'nomor_kantor' => ['nullable', 'string', 'max:30'],
                'jabatan' => ['nullable', 'string', 'max:120'],
                'unit_kerja' => ['nullable', 'string', 'max:255'],
                'alamat_kantor' => ['nullable', 'string', 'max:1000'],
                'foto_profile' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
                'remove_photo' => ['nullable', 'boolean'],
            ],
            [
                'full_name.required' => 'Nama lengkap wajib diisi.',
                'full_name.min' => 'Nama lengkap minimal 3 karakter.',
                'email_kantor.required' => 'Email wajib diisi.',
                'email_kantor.email' => 'Format email tidak valid.',
                'email_kantor.unique' => 'Email ini sudah digunakan akun lain.',
                'foto_profile.image' => 'File foto harus berupa gambar.',
                'foto_profile.mimes' => 'Format foto harus PNG, JPG, atau JPEG.',
                'foto_profile.max' => 'Ukuran foto maksimal 5MB.',
            ]
        );

        $payload = [];

        $addColumn = function (string $column, mixed $value) use (&$payload) {
            if (Schema::hasTable('users') && Schema::hasColumn('users', $column)) {
                $payload[$column] = $value;
            }
        };

        $blankToNull = function (mixed $value): ?string {
            $clean = trim((string) ($value ?? ''));

            return $clean === '' ? null : $clean;
        };

        $fullName = trim($data['full_name']);
        $email = strtolower(trim($data['email_kantor']));

        $addColumn('nama_lengkap', $fullName);
        $addColumn('name', $fullName);
        $addColumn('email', $email);
        $addColumn('email_kantor', $email);
        $addColumn('nip', $blankToNull($data['nip'] ?? null));
        $addColumn('nomor_telepon', $blankToNull($data['nomor_telepon'] ?? null));
        $addColumn('nomor_kantor', $blankToNull($data['nomor_kantor'] ?? null));
        $addColumn('jabatan', $blankToNull($data['jabatan'] ?? null));
        $addColumn('unit_kerja', $blankToNull($data['unit_kerja'] ?? null));
        $addColumn('alamat_kantor', $blankToNull($data['alamat_kantor'] ?? null));

        $oldPhoto = (string) ($user->foto_profile ?? '');
        $nextPhoto = $oldPhoto;
        $removePhoto = $request->boolean('remove_photo');

        if ($request->hasFile('foto_profile') && Schema::hasColumn('users', 'foto_profile')) {
            $file = $request->file('foto_profile');
            $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $filename = Str::uuid()->toString() . '.' . $extension;
            $folder = 'profile-photos/admin/' . preg_replace('/[^A-Za-z0-9_\-]/', '-', (string) $userKey);

            $nextPhoto = $file->storeAs($folder, $filename, 'public');
            $addColumn('foto_profile', $nextPhoto);
        } elseif ($removePhoto && Schema::hasColumn('users', 'foto_profile')) {
            $nextPhoto = '';
            $addColumn('foto_profile', null);
        }

        $addColumn('updated_at', now());

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'database' => 'Tidak ada kolom profil yang bisa diperbarui pada tabel users.',
            ]);
        }

        DB::table('users')
            ->where($userKeyColumn, $userKey)
            ->update($payload);

        if (($request->hasFile('foto_profile') || $removePhoto) && $oldPhoto && $oldPhoto !== $nextPhoto) {
            $cleanPath = trim($oldPhoto);

            if (
                $cleanPath !== '' &&
                !preg_match('/^https?:\/\//i', $cleanPath) &&
                !preg_match('/^(data:|blob:)/i', $cleanPath)
            ) {
                $cleanPath = str_replace('\\', '/', $cleanPath);
                $cleanPath = preg_replace('#^/storage/#', '', $cleanPath);
                $cleanPath = preg_replace('#^storage/#', '', $cleanPath);
                $cleanPath = preg_replace('#^public/#', '', $cleanPath);

                if ($cleanPath && Storage::disk('public')->exists($cleanPath)) {
                    Storage::disk('public')->delete($cleanPath);
                }
            }
        }

        return redirect()
            ->back()
            ->with('success', 'Profil admin berhasil diperbarui.');
    })->name('admin.profile.update');

    /* Profile */
    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');

    Route::patch('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');

    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->name('profile.destroy');
});

require __DIR__ . '/auth.php';
