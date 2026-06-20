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
            $query->where('user_id', $user->id_user);
        } elseif ($user->role === 'paralegal') {
            // Ambil id_posbankum penugasan yang aktif dari pivot posbankum_paralegal
            $id_posbankum = DB::table('posbankum_paralegal')
                ->where('id_user', $user->id_user)
                ->where('status', 'aktif')
                ->orderBy('is_primary', 'desc')
                ->value('id_posbankum');

            if ($id_posbankum) {
                $query->where('id_posbankum', $id_posbankum);
            } else {
                // Jika paralegal belum ditugaskan, return data kosong
                $query->whereRaw('1 = 0');
            }
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
            'id_posbankum' => 'required|string',
            'id_kabupaten' => 'nullable|string',
            'id_kecamatan' => 'nullable|string',
            'id_kelurahan' => 'nullable|string',
            'nomor_pengaduan' => 'required|string|unique:pengaduan,nomor_pengaduan',
            'nama_pelapor' => 'required|string',
            'nik' => 'required|string|size:16',
            'nomor_telepon' => 'required|string',
            'judul_pengaduan' => 'required|string',
            'jenis_masalah' => 'required|string',
            'kronologi' => 'required|string',
            'lokasi_kejadian' => 'required|string',
            'tanggal_kejadian' => 'required|date',
            'waktu_kejadian' => 'nullable',
            'prioritas' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $id = (string) Str::uuid();
        DB::table('pengaduan')->insert([
            'id_pengaduan' => $id,
            'nomor_pengaduan' => $request->nomor_pengaduan,
            'nama_pelapor' => $request->nama_pelapor,
            'nomor_telepon' => $request->nomor_telepon,
            'email' => $request->user()->email,
            'nik' => $request->nik,
            'jenis_masalah' => $request->jenis_masalah,
            'judul_pengaduan' => $request->judul_pengaduan,
            'kronologi' => $request->kronologi,
            'tanggal_kejadian' => $request->tanggal_kejadian,
            'waktu_kejadian' => $request->waktu_kejadian,
            'lokasi_kejadian' => $request->lokasi_kejadian,
            'status' => $request->status ?? 'menunggu',
            'prioritas' => $request->prioritas ?? 'Normal',
            'user_id' => $request->user()->id_user,
            'id_posbankum' => $request->id_posbankum,
            'id_kabupaten' => $request->id_kabupaten,
            'id_kecamatan' => $request->id_kecamatan,
            'id_kelurahan' => $request->id_kelurahan,
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
        $request->validate([
            'status' => 'required|string|in:menunggu,diproses,selesai,dibatalkan',
            'catatan_internal' => 'nullable|string'
        ]);

        $user = $request->user();
        $updateData = [
            'status' => $request->status,
            'updated_at' => now(),
        ];

        if ($request->status === 'diproses' && $user->role === 'paralegal') {
            $updateData['id_paralegal'] = $user->id_user;
        }

        if ($request->status === 'selesai') {
            $updateData['tgl_selesai'] = now();
        }

        if ($request->has('catatan_internal')) {
            $updateData['catatan_internal'] = $request->catatan_internal;
        }

        DB::table('pengaduan')->where('id_pengaduan', $id)->update($updateData);

        return response()->json([
            'status' => true,
            'message' => 'Status diupdate',
            'data' => null
        ]);
    }

    public function statistik(Request $request)
    {
        $user = $request->user();
        $query = DB::table('pengaduan');

        if ($user->role === 'warga') {
            $query->where('user_id', $user->id_user);
        } elseif ($user->role === 'paralegal') {
            // Ambil id_posbankum penugasan yang aktif dari pivot posbankum_paralegal
            $id_posbankum = DB::table('posbankum_paralegal')
                ->where('id_user', $user->id_user)
                ->where('status', 'aktif')
                ->orderBy('is_primary', 'desc')
                ->value('id_posbankum');

            if ($id_posbankum) {
                $query->where('id_posbankum', $id_posbankum);
            } else {
                $query->whereRaw('1 = 0');
            }
        } else {
            // Jika role lain (misal admin), return data kosong
            $query->whereRaw('1 = 0');
        }

        $stats = $query->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $defaultStats = [
            'menunggu' => 0,
            'diproses' => 0,
            'selesai' => 0,
            'dibatalkan' => 0,
        ];

        $data = array_merge($defaultStats, $stats);

        return response()->json([
            'status' => true,
            'message' => 'Statistik pengaduan berhasil dimuat',
            'data' => $data
        ]);
    }
}

