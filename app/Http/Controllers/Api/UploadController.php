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

    /**
     * Ambil daftar lampiran milik sebuah pengaduan.
     * Route: GET /pengaduan/{id}/lampiran
     */
    public function getLampiran($id)
    {
        $data = DB::table('pengaduan_lampiran')
            ->where('id_pengaduan', $id)
            ->orderBy('created_at', 'asc')
            ->get();

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

            // Simpan ke storage/app/public/lampiran/{id_pengaduan}/
            $path = $file->store("lampiran/{$id}", 'public');

            // Buat URL publik
            $url = asset('storage/' . $path);

            // Insert ke tabel pengaduan_lampiran
            $idLampiran = (string) Str::uuid();
            DB::table('pengaduan_lampiran')->insert([
                'id_lampiran'     => $idLampiran,
                'id_pengaduan'    => $id,
                'id_timeline'     => $request->id_timeline,
                'nama_file'       => $file->getClientOriginalName(),
                'path_file'       => $url,
                'mime_type'       => $file->getClientMimeType(),
                'size_bytes'      => $file->getSize(),
                'jenis_lampiran'  => $request->jenis_lampiran ?? 'bukti_awal',
                'created_by'      => $request->user()->id_user,
                'created_at'      => now(),
            ]);

            $data = DB::table('pengaduan_lampiran')->where('id_lampiran', $idLampiran)->first();

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
}
