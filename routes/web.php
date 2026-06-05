<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('LandingPage');
})->name('home');

Route::get('/dashboard', function () {
    $role = auth()->user()->role ?? null;

    return match ($role) {
        'admin' => redirect()->route('admin.dashboard'),
        'paralegal', 'posbankum' => redirect()->route('posbankum.dashboard'),
        default => redirect()->route('home'),
    };
})->middleware(['auth'])->name('dashboard');

Route::middleware(['auth'])->group(function () {
    Route::get('/admin', [DashboardController::class, 'admin'])
        ->name('admin.dashboard');

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