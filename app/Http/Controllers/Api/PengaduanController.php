<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PengaduanController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = DB::table('pengaduan');

        if ($user->role === 'warga') {
            $query->where('created_by', $user->id_user);
        } elseif ($user->role === 'paralegal') {
            $query->where('id_posbankum', $user->id_posbankum);
        }

        $data = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => true,
            'message' => 'Berhasil',
            'data' => $data
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'judul' => 'required|string',
            'deskripsi' => 'required|string',
            'id_posbankum' => 'required|string',
        ]);

        $id = Str::uuid();
        DB::table('pengaduan')->insert([
            'id_pengaduan' => $id,
            'id_user' => $request->user()->id_user,
            'id_posbankum' => $request->id_posbankum,
            'judul' => $request->judul,
            'deskripsi' => $request->deskripsi,
            'status' => 'menunggu',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $data = DB::table('pengaduan')->where('id_pengaduan', $id)->first();

        return response()->json([
            'status' => true,
            'message' => 'Pengaduan berhasil dibuat',
            'data' => $data
        ], 201);
    }

    public function show($id)
    {
        $data = DB::table('pengaduan')->where('id_pengaduan', $id)->first();
        if (!$data) {
            return response()->json(['status' => false, 'message' => 'Tidak ditemukan', 'data' => null], 404);
        }
        return response()->json(['status' => true, 'message' => 'Berhasil', 'data' => $data]);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|string']);
        DB::table('pengaduan')->where('id_pengaduan', $id)->update([
            'status' => $request->status,
            'updated_at' => now(),
        ]);
        return response()->json(['status' => true, 'message' => 'Status diupdate', 'data' => null]);
    }
}
