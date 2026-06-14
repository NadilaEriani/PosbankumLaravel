<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PengaduanController;
use App\Http\Controllers\Api\TimelineController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\WilayahController;
use App\Http\Controllers\Api\KegiatanController;
use App\Http\Controllers\Api\NotifikasiController;
use App\Http\Controllers\Api\PosbankumController;
use App\Http\Controllers\Api\UploadController;

// Auth (tanpa token)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Wilayah (publik, untuk dropdown register)
Route::get('/posbankum', [PosbankumController::class, 'index']);
Route::get('/posbankum/{id}', [PosbankumController::class, 'show']);

Route::get('/wilayah/kabupaten', [WilayahController::class, 'kabupaten']);
Route::get('/wilayah/kecamatan', [WilayahController::class, 'kecamatan']);
Route::get('/wilayah/kelurahan', [WilayahController::class, 'kelurahan']);

// Endpoint dengan autentikasi Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);

    // Profil
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);

    // Pengaduan
    Route::get('/pengaduan', [PengaduanController::class, 'index']);
    Route::post('/pengaduan', [PengaduanController::class, 'store']);
    Route::get('/pengaduan/{id}', [PengaduanController::class, 'show']);
    Route::patch('/pengaduan/{id}/status', [PengaduanController::class, 'updateStatus']);

    // Timeline
    Route::get('/pengaduan/{id}/timeline', [TimelineController::class, 'index']);
    Route::post('/pengaduan/{id}/timeline', [TimelineController::class, 'store']);

    // Chat
    Route::get('/chat/{id_pengaduan}', [ChatController::class, 'index']);
    Route::post('/chat/{id_pengaduan}', [ChatController::class, 'store']);

    // Kegiatan
    Route::get('/kegiatan', [KegiatanController::class, 'index']);
    Route::post('/kegiatan', [KegiatanController::class, 'store']);

    // Notifikasi
    Route::post('/upload/foto-profil', [UploadController::class, 'uploadFotoProfil']);
    Route::post('/pengaduan/{id}/lampiran', [UploadController::class, 'uploadLampiran']);
    Route::get('/pengaduan/{id}/lampiran', [UploadController::class, 'getLampiran']);

    Route::get('/notifikasi', [NotifikasiController::class, 'index']);
    Route::patch('/notifikasi/{id}/read', [NotifikasiController::class, 'markRead']);
});
