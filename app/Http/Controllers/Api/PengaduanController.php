<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PengaduanController extends Controller
{
    /**
     * Daftar pengaduan.
     * - Warga: hanya pengaduan miliknya (filter by user_id)
     * - Paralegal: pengaduan dimana warga pengaju memiliki id_kelurahan
     *   yang sama dengan kelurahan posbankum tempat paralegal bertugas.
     *   (JOIN dinamis, BUKAN filter by id_posbankum di tabel pengaduan)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = null;

        if ($user->role === 'warga') {
            $query = DB::table('pengaduan')
                ->where('user_id', $user->id_user)
                ->orderBy('created_at', 'desc');

        } elseif ($user->role === 'paralegal') {
            // Ambil id_kelurahan dari posbankum tempat paralegal bertugas
            $id_kelurahan_posbankum = DB::table('posbankum_paralegal as pp')
                ->join('posbankum as pos', 'pos.id_posbankum', '=', 'pp.id_posbankum')
                ->where('pp.id_user', $user->id_user)
                ->where('pp.status', 'aktif')
                ->orderBy('pp.is_primary', 'desc')
                ->value('pos.id_kelurahan');

            if ($id_kelurahan_posbankum) {
                // Ambil pengaduan dimana warga pengaju tinggal di kelurahan yang sama
                $query = DB::table('pengaduan as p')
                    ->join('masyarakat as m', 'm.id_user', '=', 'p.user_id')
                    ->where('m.id_kelurahan', $id_kelurahan_posbankum)
                    ->select([
                        'p.*',
                        DB::raw("
                            (
                                CASE p.status
                                    WHEN 'menunggu' THEN 10000
                                    WHEN 'diproses' THEN 5000
                                    WHEN 'selesai' THEN 0
                                    ELSE 0
                                END
                                +
                                CASE p.prioritas
                                    WHEN 'Sangat Tinggi' THEN 500
                                    WHEN 'Tinggi' THEN 400
                                    WHEN 'Menengah' THEN 300
                                    WHEN 'Normal' THEN 200
                                    WHEN 'Rendah' THEN 100
                                    ELSE 200
                                END
                                +
                                CASE
                                    WHEN p.prioritas IN ('Sangat Tinggi', 'Tinggi') 
                                    THEN DATEDIFF(NOW(), p.tanggal_kejadian) * 2.0
                                    ELSE DATEDIFF(NOW(), p.tanggal_kejadian) * 0.2
                                END
                                +
                                TIMESTAMPDIFF(HOUR, p.created_at, NOW()) * 0.5
                            ) AS priority_score
                        ")
                    ])
                    ->orderBy('priority_score', 'desc');
            }
        }

        if ($query) {
            if ($request->has('page') || $request->has('limit')) {
                $limit = (int) $request->input('limit', 10);
                $page = (int) $request->input('page', 1);
                $offset = ($page - 1) * $limit;
                $data = $query->limit($limit)->offset($offset)->get();
            } else {
                $data = $query->get();
            }
        } else {
            $data = collect([]);
        }

        return response()->json([
            'status' => true,
            'message' => 'Berhasil',
            'data' => $data
        ]);
    }

    /**
     * Buat pengaduan baru.
     * Kolom yang disimpan = snapshot data warga + detail aduan.
     * TIDAK menyimpan id_posbankum — relasi ke posbankum via JOIN dinamis.
     */
    public function store(Request $request)
    {
        $request->validate([
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
            'status' => 'menunggu',
            'prioritas' => $this->determinePriority($request->jenis_masalah),
            'user_id' => $request->user()->id_user,
            // id_paralegal = NULL (belum ada yang klaim)
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

    /**
     * Update status pengaduan oleh paralegal.
     * - 'diproses': paralegal klaim kasus → id_paralegal diisi otomatis
     * - 'selesai': tgl_selesai diisi
     * - 'dibatalkan': catatan_internal wajib (alasan penolakan)
     */
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

        // Paralegal klaim kasus → isi id_paralegal dengan id_user paralegal
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

    /**
     * Statistik pengaduan per status.
     * - Warga: total pengaduan miliknya per status
     * - Paralegal: total pengaduan masuk ke wilayahnya per status (JOIN dinamis)
     */
    public function statistik(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'warga') {
            $stats = DB::table('pengaduan')
                ->where('user_id', $user->id_user)
                ->select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status')
                ->all();

        } elseif ($user->role === 'paralegal') {
            // Ambil id_kelurahan dari posbankum tempat paralegal bertugas
            $id_kelurahan_posbankum = DB::table('posbankum_paralegal as pp')
                ->join('posbankum as pos', 'pos.id_posbankum', '=', 'pp.id_posbankum')
                ->where('pp.id_user', $user->id_user)
                ->where('pp.status', 'aktif')
                ->orderBy('pp.is_primary', 'desc')
                ->value('pos.id_kelurahan');

            if ($id_kelurahan_posbankum) {
                $stats = DB::table('pengaduan as p')
                    ->join('masyarakat as m', 'm.id_user', '=', 'p.user_id')
                    ->where('m.id_kelurahan', $id_kelurahan_posbankum)
                    ->select('p.status', DB::raw('count(*) as total'))
                    ->groupBy('p.status')
                    ->pluck('total', 'p.status')
                    ->all();
            } else {
                $stats = [];
            }
        } else {
            $stats = [];
        }

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

    private function determinePriority($jenisMasalah)
    {
        $jenis = strtolower(trim($jenisMasalah));
        
        if (str_contains($jenis, 'kekerasan & pelanggaran fisik') || str_contains($jenis, 'seksual') || str_contains($jenis, 'narkotika')) {
            return 'Sangat Tinggi';
        }
        if (str_contains($jenis, 'gender') || str_contains($jenis, 'bullying') || str_contains($jenis, 'perundungan') || str_contains($jenis, 'siber') || str_contains($jenis, 'digital')) {
            return 'Tinggi';
        }
        if (str_contains($jenis, 'keluarga') || str_contains($jenis, 'perdata rumah tangga') || str_contains($jenis, 'perburuhan') || str_contains($jenis, 'ketenagakerjaan') || str_contains($jenis, 'tanah')) {
            return 'Menengah';
        }
        if (str_contains($jenis, 'properti') || str_contains($jenis, 'harta benda') || (str_contains($jenis, 'perdata') && str_contains($jenis, 'umum'))) {
            return 'Normal';
        }
        return 'Rendah';
    }
}
