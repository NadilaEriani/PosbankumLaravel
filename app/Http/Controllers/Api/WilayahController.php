<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WilayahController extends Controller
{
    public function kabupaten()
    {
        $data = DB::table('kabupaten')->orderBy('nama')->get();
        return response()->json(['status' => true, 'message' => 'Berhasil', 'data' => $data]);
    }

    public function kecamatan(Request $request)
    {
        $query = DB::table('kecamatan')->orderBy('nama');
        if ($request->id_kabupaten) {
            $query->where('id_kabupaten', $request->id_kabupaten);
        }
        return response()->json(['status' => true, 'message' => 'Berhasil', 'data' => $query->get()]);
    }

    public function kelurahan(Request $request)
    {
        $query = DB::table('kelurahan')->orderBy('nama');
        if ($request->id_kecamatan) {
            $query->where('id_kecamatan', $request->id_kecamatan);
        }
        return response()->json(['status' => true, 'message' => 'Berhasil', 'data' => $query->get()]);
    }
}
