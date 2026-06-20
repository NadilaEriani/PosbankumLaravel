<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PosbankumController extends Controller
{
    // Daftar semua posbankum (untuk dropdown)
    public function index(Request $request)
    {
        $query = DB::table('posbankum as p')
            ->leftJoin('kelurahan as k', 'p.id_kelurahan', '=', 'k.id_kelurahan')
            ->leftJoin('kecamatan as kc', 'k.id_kecamatan', '=', 'kc.id_kecamatan')
            ->leftJoin('kabupaten as kb', 'kc.id_kabupaten', '=', 'kb.id_kabupaten')
            ->select(
                'p.id_posbankum',
                'p.id_kelurahan',
                'p.nama',
                'p.alamat',
                'p.nomor_tlp',
                'p.email_akun',
                'p.latitude',
                'p.longitude',
                'p.gambar',
                'k.nama as kelurahan',
                'kc.nama as kecamatan',
                'kb.nama as kabupaten'
            );

        // Filter by kabupaten kalau ada
        if ($request->id_kabupaten) {
            $query->where('kc.id_kabupaten', $request->id_kabupaten);
        }

        // Filter by kecamatan kalau ada
        if ($request->id_kecamatan) {
            $query->where('k.id_kecamatan', $request->id_kecamatan);
        }

        // Search by nama
        if ($request->search) {
            $query->where('p.nama', 'like', '%' . $request->search . '%');
        }

        $data = $query->orderBy('p.nama')->get();

        return response()->json([
            'status'  => true,
            'message' => 'Berhasil',
            'data'    => $data
        ]);
    }

    // Detail satu posbankum
    public function show($id)
    {
        $data = DB::table('posbankum as p')
            ->leftJoin('kelurahan as k', 'p.id_kelurahan', '=', 'k.id_kelurahan')
            ->leftJoin('kecamatan as kc', 'k.id_kecamatan', '=', 'kc.id_kecamatan')
            ->leftJoin('kabupaten as kb', 'kc.id_kabupaten', '=', 'kb.id_kabupaten')
            ->select(
                'p.*',
                'k.nama as kelurahan',
                'kc.nama as kecamatan',
                'kb.nama as kabupaten'
            )
            ->where('p.id_posbankum', $id)
            ->first();

        if (!$data) {
            return response()->json([
                'status'  => false,
                'message' => 'Posbankum tidak ditemukan',
                'data'    => null
            ], 404);
        }

        // Ambil paralegal aktif di posbankum ini
        $paralegal = DB::table('posbankum_paralegal as pp')
            ->join('users as u', 'pp.id_user', '=', 'u.id_user')
            ->select('u.id_user', 'u.nama_lengkap', 'u.nomor_telepon', 'u.foto_profile', 'pp.is_primary')
            ->where('pp.id_posbankum', $id)
            ->where('pp.status', 'aktif')
            ->get();

        $data->paralegal = $paralegal;

        return response()->json([
            'status'  => true,
            'message' => 'Berhasil',
            'data'    => $data
        ]);
    }
}
