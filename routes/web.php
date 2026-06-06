<?php

use App\Http\Controllers\Admin\ManajemenAkunController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('LandingPage');
})->name('home');

Route::get('/dashboard', function () {
    $user = Auth::user();
    $role = $user ? $user->role : null;

    if ($role === 'admin') {
        return redirect()->route('admin.dashboard');
    }

    if ($role === 'paralegal' || $role === 'posbankum') {
        return redirect()->route('posbankum.dashboard');
    }

    return redirect()->route('home');
})->middleware(['auth'])->name('dashboard');

Route::middleware(['auth'])->group(function () {
    Route::get('/admin', [DashboardController::class, 'admin'])
        ->name('admin.dashboard');

    Route::post('/admin/manajemen-akun/paralegal', [ManajemenAkunController::class, 'store'])
        ->name('admin.manajemen-akun.paralegal.store');

    Route::put('/admin/manajemen-akun/paralegal/{idUser}', [ManajemenAkunController::class, 'update'])
        ->name('admin.manajemen-akun.paralegal.update');

    Route::delete('/admin/manajemen-akun/paralegal/{idUser}', [ManajemenAkunController::class, 'destroy'])
        ->name('admin.manajemen-akun.paralegal.destroy');

    Route::get('/posbankum', [DashboardController::class, 'posbankum'])
        ->name('posbankum.dashboard');

    Route::get('/paralegal', [DashboardController::class, 'posbankum'])
        ->name('paralegal.dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');

    Route::patch('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');

    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->name('profile.destroy');
});

require __DIR__ . '/auth.php';