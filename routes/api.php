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

/*
|--------------------------------------------------------------------------
| API Routes — POSBANKUM Mobile (Flutter + GetX)
| Base URL : https://sibapak.pocari.id/api
| Auth     : Laravel Sanctum (Bearer Token)
| Format   : { "status": bool, "message": "...", "data": {...} }
|--------------------------------------------------------------------------
|
| Catatan struktur DB yang relevan:
| - users               : id_user, google_id, google_token, password_hash, role (admin|paralegal|warga)
| - masyarakat          : id_user (FK), nik, alamat, id_kabupaten, id_kecamatan, id_kelurahan
| - posbankum           : id_posbankum, id_kelurahan (FK ke kelurahan)
| - posbankum_paralegal : many-to-many paralegal <-> posbankum
| - pengaduan           : id_posbankum, id_kabupaten, id_kecamatan, id_kelurahan, catatan_internal
| - pengaduan_lampiran  : id_pengaduan, id_timeline (nullable)
| - pengaduan_timeline  : id_pengaduan, title, deskripsi
| - chat_pesan          : id_pengaduan, pengirim_id, pengirim_role
| - kegiatan            : id_posbankum, judul, deskripsi, tgl_mulai, tgl_selesai, lokasi, status, hasil_kegiatan
| - notifikasi          : id_posbankum, id_user_penerima (nullable, untuk warga)
| - kabupaten / kecamatan / kelurahan : relasi via id, BUKAN nama string
| - password_reset_tokens : email, token, created_at
|
| Catatan penting:
| - Tabel berita TIDAK diekspos ke mobile (hanya web via Inertia)
| - Tabel kegiatan adalah konten yang diupload paralegal, BUKAN berita
| - catatan_internal dipakai untuk alasan penolakan & catatan akhir kasus
| - Dokumen legalitas posbankum (data_posbankum) adalah urusan web, tidak ada di mobile
| - Lampiran dokumen di mobile = bukti pengaduan warga (tabel pengaduan_lampiran)
|
*/

// =========================================================================
// PUBLIC — tanpa token
// =========================================================================

// Auth: Google OAuth — Flutter kirim id_token dari package google_sign_in
// Backend verifikasi via Laravel Socialite, return Sanctum token
Route::post('/auth/google/callback', [AuthController::class, 'googleCallback']);

// Auth: login & register manual (email + password)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Auth: lupa password (memanfaatkan tabel password_reset_tokens)
// Step 1 — kirim email reset  : POST /forgot-password { "email": "..." }
// Step 2 — submit token + pass: POST /reset-password  { "token": "...", "email": "...", "password": "..." }
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password',  [AuthController::class, 'resetPassword']);

// Posbankum — publik agar warga bisa lihat & pilih posbankum sebelum login
// GET /api/posbankum?search=...&id_kabupaten=...&id_kecamatan=...
Route::get('/posbankum',      [PosbankumController::class, 'index']);
Route::get('/posbankum/{id}', [PosbankumController::class, 'show']); // termasuk daftar paralegal aktif

// Wilayah — publik untuk dropdown saat register & input pengaduan
// Relasi: kabupaten -> kecamatan (?id_kabupaten=) -> kelurahan (?id_kecamatan=)
Route::get('/wilayah/kabupaten', [WilayahController::class, 'kabupaten']);
Route::get('/wilayah/kecamatan', [WilayahController::class, 'kecamatan']); // ?id_kabupaten={id}
Route::get('/wilayah/kelurahan', [WilayahController::class, 'kelurahan']); // ?id_kecamatan={id}

// =========================================================================
// PROTECTED — wajib Bearer Token (Authorization: Bearer <token>)
// =========================================================================
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);

    // Ganti password (untuk user yang login manual / punya password_hash)
    // Body: { "old_password": "...", "new_password": "..." }
    Route::put('/profile/password', [AuthController::class, 'changePassword']);

    // Hubungkan / lepas akun Google ke user yang sedang login
    // - link   : body { "id_token": "..." } -> isi google_id & google_token
    // - unlink : hanya boleh jika user masih punya password_hash (hindari lockout)
    Route::post('/profile/google/link',   [AuthController::class, 'linkGoogle']);
    Route::delete('/profile/google/link', [AuthController::class, 'unlinkGoogle']);

    // -------------------------------------------------------------------------
    // PROFIL
    // Ambil & update profil user yang sedang login (semua role)
    // Untuk warga: termasuk data masyarakat (nik, alamat, id_kelurahan, dll)
    // -------------------------------------------------------------------------
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);

    // -------------------------------------------------------------------------
    // UPLOAD
    // Semua upload pakai multipart/form-data, bukan JSON
    // -------------------------------------------------------------------------
    Route::post('/upload/foto-profil', [UploadController::class, 'uploadFotoProfil']); // field: foto (maks 2MB)

    // -------------------------------------------------------------------------
    // STATISTIK DASHBOARD
    // Filter role dilakukan otomatis di PengaduanController
    // Warga    : total pengaduan miliknya per status
    // Paralegal: total pengaduan masuk ke posbankumnya per status
    // -------------------------------------------------------------------------
    Route::get('/pengaduan/statistik', [PengaduanController::class, 'statistik']);

    // -------------------------------------------------------------------------
    // PENGADUAN
    // Warga    : hanya lihat miliknya (filter by id_user / masyarakat)
    // Paralegal: lihat pengaduan masuk ke posbankumnya (filter by id_posbankum)
    //            hanya pengaduan dari kelurahan yang sama dengan wilayah kerja paralegal
    // -------------------------------------------------------------------------
    Route::get('/pengaduan',      [PengaduanController::class, 'index']);
    Route::post('/pengaduan',     [PengaduanController::class, 'store']);
    Route::get('/pengaduan/{id}', [PengaduanController::class, 'show']);

    // Paralegal: update status pengaduan
    // Body: { "status": "diproses|selesai|dibatalkan", "catatan_internal": "..." }
    // catatan_internal WAJIB diisi jika status = dibatalkan (alasan penolakan)
    // catatan_internal opsional jika status = selesai (catatan akhir penyelesaian)
    Route::patch('/pengaduan/{id}/status', [PengaduanController::class, 'updateStatus']);

    // -------------------------------------------------------------------------
    // LAMPIRAN PENGADUAN (bukti dokumen dari warga)
    // Tabel: pengaduan_lampiran
    // Warga    : hanya bisa lihat & upload lampiran dari pengaduan miliknya
    // Paralegal: bisa lihat semua lampiran dari pengaduan yang masuk ke wilayah kerjanya
    //            (id_kelurahan masyarakat harus cocok dengan wilayah kerja paralegal)
    // Upload pakai multipart/form-data, maks 10MB
    // Field: file (wajib), jenis_lampiran (opsional: bukti_awal|progress|chat|lainnya)
    //        id_timeline (opsional, jika lampiran terkait progress tertentu)
    // -------------------------------------------------------------------------
    Route::get('/pengaduan/{id}/lampiran',  [UploadController::class, 'getLampiran']);
    Route::post('/pengaduan/{id}/lampiran', [UploadController::class, 'uploadLampiran']);

    // -------------------------------------------------------------------------
    // TIMELINE / PROGRES KASUS
    // Paralegal: tambah update progres kasus
    // Body: { "title": "...", "deskripsi": "..." }
    // -------------------------------------------------------------------------
    Route::get('/pengaduan/{id}/timeline',  [TimelineController::class, 'index']);
    Route::post('/pengaduan/{id}/timeline', [TimelineController::class, 'store']);

    // -------------------------------------------------------------------------
    // CHAT
    // Komunikasi antara warga dan paralegal per kasus
    // Body kirim: { "isi_pesan": "..." }
    // -------------------------------------------------------------------------
    Route::get('/chat/{id_pengaduan}',  [ChatController::class, 'index']);
    Route::post('/chat/{id_pengaduan}', [ChatController::class, 'store']);

    // -------------------------------------------------------------------------
    // KEGIATAN (bukan tabel berita — berita hanya untuk web)
    // Tabel: kegiatan (id_posbankum, judul, deskripsi, tgl_mulai, tgl_selesai,
    //                  lokasi, kategori, anggota_terlibat, hasil_kegiatan, status)
    // GET  : semua role bisa baca
    // POST : hanya paralegal (validasi role di controller)
    // PUT  : hanya paralegal pemilik kegiatan tersebut
    // -------------------------------------------------------------------------
    Route::get('/kegiatan',      [KegiatanController::class, 'index']);
    Route::post('/kegiatan',     [KegiatanController::class, 'store']);
    Route::get('/kegiatan/{id}', [KegiatanController::class, 'show']);
    Route::put('/kegiatan/{id}', [KegiatanController::class, 'update']);

    // -------------------------------------------------------------------------
    // NOTIFIKASI
    // Paralegal: filter by id_posbankum
    // Warga    : filter by id_user_penerima
    // Controller filter otomatis berdasarkan role user yang login
    // -------------------------------------------------------------------------
    Route::get('/notifikasi',              [NotifikasiController::class, 'index']);
    Route::get('/notifikasi/unread-count', [NotifikasiController::class, 'unreadCount']);
    Route::patch('/notifikasi/{id}/read',  [NotifikasiController::class, 'markRead']);
    Route::patch('/notifikasi/read-all',   [NotifikasiController::class, 'markAllRead']);
});