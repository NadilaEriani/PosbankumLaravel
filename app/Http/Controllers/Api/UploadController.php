<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    /**
     * Mengunggah foto profil ke disk public (storage/profiles/) 
     * dan memperbarui foto_profile pada user yang sedang aktif.
     */
    public function uploadFotoProfil(Request $request)
    {
        $request->validate([
            'foto' => 'required|image|mimes:jpeg,png,jpg|max:2048', // Kapasitas maks 2MB
        ]);

        if ($request->hasFile('foto')) {
            $user = $request->user();
            
            // Simpan foto ke folder public/profiles
            $path = $request->file('foto')->store('profiles', 'public');
            
            // Dapatkan URL publik
            $url = asset('storage/' . $path);

            // Perbarui data foto_profile di tabel users
            $user->update([
                'foto_profile' => $url
            ]);

            return response()->json([
                'status'  => true,
                'message' => 'Foto profil berhasil diunggah',
                'data'    => [
                    'foto_profile' => $url,
                    'url'          => $url
                ]
            ]);
        }

        return response()->json([
            'status'  => false,
            'message' => 'Gagal mengunggah file. Berkas tidak ditemukan.'
        ], 400);
    }

    public function getLampiran($id)
    {
        $data = DB::table('pengaduan_lampiran')
            ->where('id_pengaduan', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        foreach ($data as $item) {
            $item->path_file = url("api/pengaduan/{$id}/lampiran/{$item->id_lampiran}/view");
        }

        return response()->json([
            'status' => true,
            'message' => 'Berhasil',
            'data' => $data
        ]);
    }

    /**
     * Upload lampiran untuk sebuah pengaduan.
     * Route: POST /pengaduan/{id}/lampiran
     *
     * Request (multipart/form-data):
     *   - file: wajib, maks 10MB (jpeg, png, jpg, pdf)
     *   - jenis_lampiran: opsional (bukti_awal, progress, chat, lainnya), default bukti_awal
     *   - id_timeline: opsional (jika lampiran terkait timeline tertentu)
     */
    public function uploadLampiran(Request $request, $id)
    {
        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,jpg,pdf|max:10240', // Maks 10MB
            'jenis_lampiran' => 'nullable|string|in:bukti_awal,progress,chat,lainnya',
            'id_timeline' => 'nullable|string',
        ]);

        // Pastikan pengaduan ada
        $pengaduan = DB::table('pengaduan')->where('id_pengaduan', $id)->first();
        if (!$pengaduan) {
            return response()->json([
                'status' => false,
                'message' => 'Pengaduan tidak ditemukan'
            ], 404);
        }

        if ($request->hasFile('file')) {
            $file = $request->file('file');

            // Simpan ke storage/app/lampiran/{id_pengaduan}/ (disk local = private)
            $path = $file->store("lampiran/{$id}", 'local');

            // Insert ke tabel pengaduan_lampiran
            $idLampiran = (string) Str::uuid();
            DB::table('pengaduan_lampiran')->insert([
                'id_lampiran'     => $idLampiran,
                'id_pengaduan'    => $id,
                'id_timeline'     => $request->id_timeline,
                'nama_file'       => $file->getClientOriginalName(),
                'path_file'       => $path, // Simpan relative path: lampiran/{id_pengaduan}/filename.ext
                'mime_type'       => $file->getClientMimeType(),
                'size_bytes'      => $file->getSize(),
                'jenis_lampiran'  => $request->jenis_lampiran ?? 'bukti_awal',
                'created_by'      => $request->user()->id_user,
                'created_at'      => now(),
            ]);

            $data = DB::table('pengaduan_lampiran')->where('id_lampiran', $idLampiran)->first();
            // Map path_file ke secure URL untuk output response
            $data->path_file = url("api/pengaduan/{$id}/lampiran/{$idLampiran}/view");

            return response()->json([
                'status' => true,
                'message' => 'Lampiran berhasil diunggah',
                'data' => $data
            ], 201);
        }

        return response()->json([
            'status' => false,
            'message' => 'File tidak ditemukan dalam request'
        ], 400);
    }

    /**
     * Tampilkan/unduh file secara terproteksi.
     * Route: GET /pengaduan/{id}/lampiran/{id_lampiran}/view
     */
    public function viewLampiranPrivate(Request $request, $id, $id_lampiran)
    {
        $user = $request->user();

        // 1. Ambil data lampiran
        $lampiran = DB::table('pengaduan_lampiran')
            ->where('id_lampiran', $id_lampiran)
            ->where('id_pengaduan', $id)
            ->first();

        if (!$lampiran) {
            return response()->json(['status' => false, 'message' => 'Lampiran tidak ditemukan'], 404);
        }

        // 2. Ambil data pengaduan untuk cek kepemilikan / penugasan
        $pengaduan = DB::table('pengaduan')
            ->where('id_pengaduan', $id)
            ->first();

        if (!$pengaduan) {
            return response()->json(['status' => false, 'message' => 'Pengaduan tidak ditemukan'], 404);
        }

        // 3. Pengecekan Otorisasi Berdasarkan Role
        $isAuthorized = false;

        if ($user->role === 'admin') {
            $isAuthorized = true;
        } elseif ($user->role === 'warga') {
            // Warga hanya boleh akses lampiran aduannya sendiri
            if ($user->id_user === $pengaduan->user_id) {
                $isAuthorized = true;
            }
        } elseif ($user->role === 'paralegal') {
            // Paralegal hanya boleh akses lampiran aduan yang kelurahan pembuatnya
            // sama dengan kelurahan posbankum tempat dia bertugas
            $id_kelurahan_posbankum = DB::table('posbankum_paralegal as pp')
                ->join('posbankum as pos', 'pos.id_posbankum', '=', 'pp.id_posbankum')
                ->where('pp.id_user', $user->id_user)
                ->where('pp.status', 'aktif')
                ->orderBy('pp.is_primary', 'desc')
                ->value('pos.id_kelurahan');

            if ($id_kelurahan_posbankum) {
                $pelapor = DB::table('masyarakat')
                    ->where('id_user', $pengaduan->user_id)
                    ->first();
                
                if ($pelapor && $pelapor->id_kelurahan === $id_kelurahan_posbankum) {
                    $isAuthorized = true;
                }
            }
        }

        if (!$isAuthorized) {
            return response()->json(['status' => false, 'message' => 'Anda tidak memiliki hak akses untuk dokumen ini'], 403);
        }

        // 4. Kirim file securely dari storage private
        $path = $lampiran->path_file;
        
        // Backward compatibility: parser URL jika bertipe publik URL lama
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            $parsed = parse_url($path, PHP_URL_PATH);
            if ($parsed && str_starts_with($parsed, '/storage/')) {
                $path = 'public/' . substr($parsed, 9);
            }
        }

        $filePath = storage_path('app/' . $path);
        if (!file_exists($filePath)) {
            return response()->json(['status' => false, 'message' => 'File fisik tidak ditemukan di server'], 404);
        }

        return response()->file($filePath, [
            'Content-Type' => $lampiran->mime_type ?? 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . $lampiran->nama_file . '"'
        ]);
    }
}
