<?php

use App\Http\Controllers\Admin\ManajemenAkunController;
use App\Http\Controllers\Admin\VerifikasiDataPosbankumController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Admin\KelolaBeritaController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
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
    Route::get('/admin', [DashboardController::class, 'admin'])
        ->name('admin.dashboard');

    /* Admin Menu */
    Route::get('/admin/kelola-berita/{mode?}/{id?}', [DashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.kelola-berita.page');

    Route::post('/admin/kelola-berita', [KelolaBeritaController::class, 'store'])
        ->name('admin.kelola-berita.store');

    Route::put('/admin/kelola-berita/{id}', [KelolaBeritaController::class, 'update'])
        ->name('admin.kelola-berita.update');

    Route::delete('/admin/kelola-berita/{id}', [KelolaBeritaController::class, 'destroy'])
        ->name('admin.kelola-berita.destroy');

    Route::get('/admin/data-posbankum/{mode?}/{id?}', [DashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.data-posbankum.page');

    Route::get('/admin/verifikasi-data-posbankum/{mode?}/{id?}', [DashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.verifikasi-data-posbankum.page');

    Route::get('/admin/laporan-kegiatan/{mode?}/{id?}', [DashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.laporan-kegiatan.page');

    Route::get('/admin/manajemen-akun/{mode?}/{id?}', [DashboardController::class, 'admin'])
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
    Route::get('/paralegal', [DashboardController::class, 'paralegal'])
        ->name('paralegal.dashboard');

    Route::get('/posbankum', function () {
        return redirect()->route('paralegal.dashboard');
    })->name('posbankum.dashboard');

    /* Profile */
    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');

    Route::patch('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');

    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->name('profile.destroy');
});

require __DIR__ . '/auth.php';