<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
}
