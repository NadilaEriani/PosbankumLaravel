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
                ->leftJoin('users as u', 'u.id_user', '=', 'pengaduan.id_paralegal')
                ->select([
                    'pengaduan.*',
                    'u.foto_profile as foto_profile_lawan_bicara',
                    DB::raw("(SELECT isi_pesan FROM chat_pesan WHERE chat_pesan.id_pengaduan = pengaduan.id_pengaduan ORDER BY created_at DESC LIMIT 1) as last_message"),
                    DB::raw("(SELECT created_at FROM chat_pesan WHERE chat_pesan.id_pengaduan = pengaduan.id_pengaduan ORDER BY created_at DESC LIMIT 1) as last_message_time"),
                    DB::raw("(SELECT COUNT(*) FROM chat_pesan WHERE chat_pesan.id_pengaduan = pengaduan.id_pengaduan AND chat_pesan.is_read = 0 AND chat_pesan.pengirim_id != '$user->id_user') as unread_count")
                ])
                ->where('pengaduan.user_id', $user->id_user)
                ->orderBy('pengaduan.created_at', 'desc');

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
                    ->leftJoin('users as uw', 'uw.id_user', '=', 'p.user_id')
                    ->where('m.id_kelurahan', $id_kelurahan_posbankum)
                    ->select([
                        'p.*',
                        'uw.foto_profile as foto_profile_lawan_bicara',
                        DB::raw("(SELECT isi_pesan FROM chat_pesan WHERE chat_pesan.id_pengaduan = p.id_pengaduan ORDER BY created_at DESC LIMIT 1) as last_message"),
                        DB::raw("(SELECT created_at FROM chat_pesan WHERE chat_pesan.id_pengaduan = p.id_pengaduan ORDER BY created_at DESC LIMIT 1) as last_message_time"),
                        DB::raw("(SELECT COUNT(*) FROM chat_pesan WHERE chat_pesan.id_pengaduan = p.id_pengaduan AND chat_pesan.is_read = 0 AND chat_pesan.pengirim_id != '$user->id_user') as unread_count"),
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

        // Buat notifikasi otomatis untuk Paralegal di wilayah Posbankum kelurahan tersebut
        try {
            $warga = DB::table('masyarakat')
                ->where('id_user', $request->user()->id_user)
                ->first();
            
            if ($warga && $warga->id_kelurahan) {
                $id_posbankum = DB::table('posbankum')
                    ->where('id_kelurahan', $warga->id_kelurahan)
                    ->value('id_posbankum');
                
                if ($id_posbankum) {
                    $notifId = (string) Str::uuid();
                    $judulNotif = 'Pengaduan Baru';
                    $pesanNotif = 'Ada pengaduan baru masuk: "' . $request->judul_pengaduan . '" dari warga di wilayah Anda.';

                    DB::table('notifikasi')->insert([
                        'id_notifikasi' => $notifId,
                        'id_posbankum' => $id_posbankum,
                        'id_user_penerima' => null,
                        'judul' => $judulNotif,
                        'pesan' => $pesanNotif,
                        'kategori' => 'pengaduan',
                        'prioritas' => 'sedang',
                        'is_read' => 0,
                        'ref_table' => 'pengaduan',
                        'ref_id' => $id,
                        'created_at' => now(),
                    ]);

                    // Pemicu FCM Pop-up ke HP seluruh Paralegal aktif di Posbankum tersebut
                    $paralegalUserIds = DB::table('posbankum_paralegal')
                        ->where('id_posbankum', $id_posbankum)
                        ->where('status', 'aktif')
                        ->pluck('id_user')
                        ->all();

                    if (!empty($paralegalUserIds)) {
                        $tokens = DB::table('users')
                            ->whereIn('id_user', $paralegalUserIds)
                            ->whereNotNull('fcm_token')
                            ->where('fcm_token', '!=', '')
                            ->pluck('fcm_token')
                            ->all();

                        foreach ($tokens as $token) {
                            \App\Services\FcmService::sendPush(
                                $token,
                                $judulNotif,
                                $pesanNotif,
                                [
                                    'ref_table' => 'pengaduan',
                                    'ref_id' => $id,
                                ]
                            );
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            // Abaikan error notifikasi agar transaksi utama tetap sukses
        }

        $data = DB::table('pengaduan')->where('id_pengaduan', $id)->first();

        return response()->json([
            'status' => true,
            'message' => 'Pengaduan berhasil dibuat',
            'data' => $data
        ], 201);
    }

    public function show($id)
    {
        $data = DB::table('pengaduan as p')
            ->leftJoin('users as u', 'u.id_user', '=', 'p.id_paralegal')
            ->leftJoin('users as uw', 'uw.id_user', '=', 'p.user_id')
            ->leftJoin('masyarakat as m', 'm.id_user', '=', 'p.user_id')
            ->leftJoin('kelurahan as kel', 'kel.id_kelurahan', '=', 'm.id_kelurahan')
            ->leftJoin('kecamatan as kec', 'kec.id_kecamatan', '=', 'm.id_kecamatan')
            ->leftJoin('kabupaten as kab', 'kab.id_kabupaten', '=', 'm.id_kabupaten')
            
            // Join ke posbankum paralegal untuk mendapatkan kelurahan posbankum tempat paralegal bertugas
            ->leftJoin('posbankum_paralegal as pp', function($join) {
                $join->on('pp.id_user', '=', 'p.id_paralegal')
                     ->where('pp.status', '=', 'aktif');
            })
            ->leftJoin('posbankum as pos', 'pos.id_posbankum', '=', 'pp.id_posbankum')
            ->leftJoin('kelurahan as kel_pos', 'kel_pos.id_kelurahan', '=', 'pos.id_kelurahan')

            ->where('p.id_pengaduan', $id)
            ->select([
                'p.*',
                'u.nama_lengkap as nama_paralegal',
                'u.nomor_telepon as nomor_telepon_paralegal',
                'u.foto_profile as foto_profile_paralegal',
                'uw.foto_profile as foto_profile_pelapor',
                'kel_pos.nama as wilayah_posbankum', // Kelurahan Posbankum tempat bertugas
                DB::raw("CONCAT_WS(', ', kel.nama, kec.nama, kab.nama) as alamat_pelapor")
            ])
            ->first();

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

        // Ambil data sebelum update untuk mendapatkan detail pelapor/kasus
        $pengaduan = DB::table('pengaduan')->where('id_pengaduan', $id)->first();

        DB::table('pengaduan')->where('id_pengaduan', $id)->update($updateData);

        // Kirim notifikasi ke warga terkait update status kasus
        if ($pengaduan) {
            try {
                $judul = '';
                $pesan = '';
                $prioritas = 'sedang';

                if ($request->status === 'diproses') {
                    $judul = 'Pengaduan Diproses';
                    $pesan = 'Pengaduan Anda "' . $pengaduan->judul_pengaduan . '" sekarang sedang diproses oleh Paralegal ' . $user->nama_lengkap . '.';
                } elseif ($request->status === 'selesai') {
                    $judul = 'Pengaduan Selesai';
                    $pesan = 'Pengaduan Anda "' . $pengaduan->judul_pengaduan . '" telah selesai ditangani oleh paralegal.';
                } elseif ($request->status === 'dibatalkan') {
                    $judul = 'Pengaduan Dibatalkan';
                    $pesan = 'Pengaduan Anda "' . $pengaduan->judul_pengaduan . '" dibatalkan. Alasan: ' . ($request->catatan_internal ?? '-');
                    $prioritas = 'tinggi';
                }

                if ($judul && $pesan) {
                    DB::table('notifikasi')->insert([
                        'id_notifikasi' => (string) Str::uuid(),
                        'id_posbankum' => null,
                        'id_user_penerima' => $pengaduan->user_id,
                        'judul' => $judul,
                        'pesan' => $pesan,
                        'kategori' => 'pengaduan',
                        'prioritas' => $prioritas,
                        'is_read' => 0,
                        'ref_table' => 'pengaduan',
                        'ref_id' => $id,
                        'created_at' => now(),
                    ]);

                    // Kirim push notification FCM (Pop-Up) ke warga jika fcm_token tersedia
                    $recipientUser = DB::table('users')->where('id_user', $pengaduan->user_id)->first();
                    if ($recipientUser && !empty($recipientUser->fcm_token)) {
                        \App\Services\FcmService::sendPush(
                            $recipientUser->fcm_token,
                            $judul,
                            $pesan,
                            [
                                'ref_table' => 'pengaduan',
                                'ref_id' => $id,
                            ]
                        );
                    }
                }
            } catch (\Exception $e) {
                // Abaikan error notifikasi agar transaksi utama tetap sukses
            }
        }

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
