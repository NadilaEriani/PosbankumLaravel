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
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('LandingPage');
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

    $cleanPath = preg_replace('#[?#].*$#', '', $rawPath);
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

    Route::post('/admin/profile/password', function (Request $request) {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        if ($request->has('currentPassword')) {
            $request->merge([
                'current_password' => $request->input('currentPassword'),
                'password' => $request->input('newPassword'),
                'password_confirmation' => $request->input('confirmPassword'),
            ]);
        }

        $data = $request->validate(
            [
                'current_password' => ['required', 'string'],
                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                    'regex:/[A-Z]/',
                    'regex:/[a-z]/',
                    'regex:/[0-9]/',
                ],
            ],
            [
                'current_password.required' => 'Password saat ini wajib diisi.',
                'password.required' => 'Password baru wajib diisi.',
                'password.min' => 'Password baru minimal 8 karakter.',
                'password.confirmed' => 'Konfirmasi password belum sama.',
                'password.regex' => 'Password harus mengandung huruf besar, huruf kecil, dan angka.',
            ]
        );

        $currentHash = $user->password_hash ?? $user->password ?? null;

        if (!$currentHash || !Hash::check($data['current_password'], $currentHash)) {
            throw ValidationException::withMessages([
                'current_password' => 'Password saat ini tidak sesuai.',
            ]);
        }

        $payload = [];

        if (Schema::hasColumn('users', 'password_hash')) {
            $payload['password_hash'] = Hash::make($data['password']);
        }

        if (Schema::hasColumn('users', 'password')) {
            $payload['password'] = Hash::make($data['password']);
        }

        if (Schema::hasColumn('users', 'updated_at')) {
            $payload['updated_at'] = now();
        }

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'password' => 'Kolom password belum tersedia pada tabel users.',
            ]);
        }

        $userKeyColumn = Schema::hasColumn('users', 'id_user') ? 'id_user' : 'id';
        $userKey = $user->{$userKeyColumn}
            ?? $user->id_user
            ?? $user->id
            ?? $user->getKey();

        DB::table('users')
            ->where($userKeyColumn, $userKey)
            ->update($payload);

        return redirect()
            ->back()
            ->with('success', 'Password berhasil diperbarui.');
    })->name('admin.profile.password');

    /* Profile */
    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');

    Route::patch('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');

    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->name('profile.destroy');
});

require __DIR__ . '/auth.php';