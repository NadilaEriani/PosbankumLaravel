<?php

use App\Http\Controllers\Admin\KelolaBeritaController;
use App\Http\Controllers\Admin\ManajemenAkunController;
use App\Http\Controllers\Admin\VerifikasiDataPosbankumController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Paralegal\DashboardController as ParalegalDashboardController;
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

Route::middleware(['auth'])->group(function () {
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
    Route::patch('/admin/verifikasi-data-posbankum/dokumen/{id}/status', [VerifikasiDataPosbankumController::class, 'updateDokumenStatus'])
        ->name('admin.verifikasi-data-posbankum.dokumen.status');

    Route::patch('/admin/verifikasi-data-posbankum/tagging/{idPosbankum}/status', [VerifikasiDataPosbankumController::class, 'updateTaggingStatus'])
        ->name('admin.verifikasi-data-posbankum.tagging.status');

    Route::patch('/admin/verifikasi-data-posbankum/tagging/{idPosbankum}/location', [VerifikasiDataPosbankumController::class, 'updateTaggingLocation'])
        ->name('admin.verifikasi-data-posbankum.tagging.location');

    /* Dashboard Paralegal */
    Route::get('/paralegal', [ParalegalDashboardController::class, 'paralegal'])
        ->name('paralegal.dashboard');

    Route::get('/posbankum', function () {
        return redirect()->route('paralegal.dashboard');
    })->name('posbankum.dashboard');

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