<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TimelineController extends Controller
{
    public function index($id)
    {
        $data = DB::table('pengaduan_timeline')
            ->where('id_pengaduan', $id)
            ->orderBy('created_at', 'asc')
            ->get();
        return response()->json(['status' => true, 'message' => 'Berhasil', 'data' => $data]);
    }

    public function store(Request $request, $id)
    {
        $request->validate([
            'title'     => 'required|string|max:255',
            'deskripsi' => 'nullable|string',
        ]);

        DB::table('pengaduan_timeline')->insert([
            'id_timeline'  => Str::uuid(),
            'id_pengaduan' => $id,
            'title'        => $request->title,
            'deskripsi'    => $request->deskripsi,
            'tipe'         => 'catatan',
            'is_visible'   => 1,
            'created_by'   => $request->user()->id_user,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['status' => true, 'message' => 'Timeline ditambahkan', 'data' => null], 201);
    }
}
