<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function uploadLampiran(Request $request, $id_pengaduan)
    {
        $request->validate([
            'file'           => 'required|file|max:10240',
            'jenis_lampiran' => 'nullable|in:bukti_awal,progress,chat,lainnya',
            'id_timeline'    => 'nullable|string',
        ]);

        $file     = $request->file('file');
        $namaFile = time() . '_' . Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) . '.' . $file->getClientOriginalExtension();
        $path     = $file->storeAs('lampiran/' . $id_pengaduan, $namaFile, 'public');

        $id = Str::uuid();
        DB::table('pengaduan_lampiran')->insert([
            'id_lampiran'    => $id,
            'id_pengaduan'   => $id_pengaduan,
            'id_timeline'    => $request->id_timeline,
            'nama_file'      => $file->getClientOriginalName(),
            'path_file'      => $path,
            'mime_type'      => $file->getMimeType(),
            'size_bytes'     => $file->getSize(),
            'jenis_lampiran' => $request->jenis_lampiran ?? 'bukti_awal',
            'created_by'     => $request->user()->id_user,
            'created_at'     => now(),
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'File berhasil diupload',
            'data'    => [
                'id_lampiran' => $id,
                'nama_file'   => $file->getClientOriginalName(),
                'url'         => Storage::url($path),
                'mime_type'   => $file->getMimeType(),
                'size_bytes'  => $file->getSize(),
            ]
        ], 201);
    }

    public function getLampiran($id_pengaduan)
    {
        $data = DB::table('pengaduan_lampiran')
            ->where('id_pengaduan', $id_pengaduan)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($item) {
                $item->url = Storage::url($item->path_file);
                return $item;
            });

        return response()->json([
            'status'  => true,
            'message' => 'Berhasil',
            'data'    => $data
        ]);
    }

    public function uploadFotoProfil(Request $request)
    {
        $request->validate([
            'foto' => 'required|image|mimes:jpg,jpeg,png|max:2048',
        ]);

        $user = $request->user();
        $file = $request->file('foto');

        if ($user->foto_profile) {
            Storage::disk('public')->delete($user->foto_profile);
        }

        $path = $file->storeAs('profil', $user->id_user . '_' . time() . '.' . $file->getClientOriginalExtension(), 'public');

        DB::table('users')
            ->where('id_user', $user->id_user)
            ->update(['foto_profile' => $path, 'updated_at' => now()]);

        return response()->json([
            'status'  => true,
            'message' => 'Foto profil berhasil diupload',
            'data'    => [
                'foto_profile' => $path,
                'url'          => Storage::url($path),
            ]
        ]);
    }
}
