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

        $uuid = (string) Str::uuid();

        DB::table('pengaduan_timeline')->insert([
            'id_timeline'  => $uuid,
            'id_pengaduan' => $id,
            'title'        => $request->title,
            'deskripsi'    => $request->deskripsi,
            'tipe'         => 'catatan',
            'is_visible'   => 1,
            'created_by'   => $request->user()->id_user,
            'created_at'   => now(),
        ]);

        // Kirim notifikasi ke Warga pelapor terkait update progres
        $pengaduan = DB::table('pengaduan')->where('id_pengaduan', $id)->first();
        if ($pengaduan && !empty($pengaduan->user_id)) {
            try {
                $judulNotif = 'Update Progres Kasus';
                $pesanNotif = 'Paralegal menambahkan progres baru pada aduan "' . $pengaduan->judul_pengaduan . '": ' . $request->title;

                DB::table('notifikasi')->insert([
                    'id_notifikasi'    => (string) Str::uuid(),
                    'id_posbankum'     => null,
                    'id_user_penerima' => $pengaduan->user_id,
                    'judul'            => $judulNotif,
                    'pesan'            => $pesanNotif,
                    'kategori'         => 'pengaduan',
                    'prioritas'        => 'sedang',
                    'is_read'          => 0,
                    'ref_table'        => 'pengaduan',
                    'ref_id'           => $id,
                    'created_at'       => now(),
                ]);

                // Kirim push notification FCM ke warga jika fcm_token tersedia
                $recipientUser = DB::table('users')->where('id_user', $pengaduan->user_id)->first();
                if ($recipientUser && !empty($recipientUser->fcm_token)) {
                    \App\Services\FcmService::sendPush(
                        $recipientUser->fcm_token,
                        $judulNotif,
                        $pesanNotif,
                        [
                            'ref_table' => 'pengaduan',
                            'ref_id'    => $id,
                        ]
                    );
                }
            } catch (\Exception $e) {
                // Abaikan error notifikasi agar transaksi utama timeline tetap sukses
            }
        }

        $data = DB::table('pengaduan_timeline')->where('id_timeline', $uuid)->first();

        return response()->json(['status' => true, 'message' => 'Timeline ditambahkan', 'data' => $data], 201);
    }
}
