<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class KegiatanController extends Controller
{
    public function index()
    {
        $data = DB::table('kegiatan')->orderBy('tgl_upload', 'desc')->get();
        return response()->json(['status' => true, 'message' => 'Berhasil', 'data' => $data]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'judul' => 'required|string',
            'deskripsi' => 'required|string',
        ]);
        DB::table('kegiatan')->insert([
            'id_kegiatan' => Str::uuid(),
            'id_posbankum' => $request->user()->id_posbankum,
            'id_user' => $request->user()->id_user,
            'judul' => $request->judul,
            'deskripsi' => $request->deskripsi,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['status' => true, 'message' => 'Kegiatan ditambahkan', 'data' => null], 201);
    }
}
