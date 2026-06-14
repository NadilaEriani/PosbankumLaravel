<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    public function index($id_pengaduan)
    {
        $data = DB::table('chat_pesan')
            ->where('id_pengaduan', $id_pengaduan)
            ->orderBy('created_at', 'asc')
            ->get();
        return response()->json(['status' => true, 'message' => 'Berhasil', 'data' => $data]);
    }

    public function store(Request $request, $id_pengaduan)
    {
        $request->validate(['pesan' => 'required|string']);
        $id = Str::uuid();
        DB::table('chat_pesan')->insert([
            'id_chat' => $id,
            'id_pengaduan' => $id_pengaduan,
            'id_user' => $request->user()->id_user,
            'pesan' => $request->pesan,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $data = DB::table('chat_pesan')->where('id_chat', $id)->first();
        return response()->json(['status' => true, 'message' => 'Pesan terkirim', 'data' => $data], 201);
    }
}
