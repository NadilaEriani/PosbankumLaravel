<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AksesPengaduan;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    use AksesPengaduan;

    public function index(Request $request, $id_pengaduan)
    {
        $user = $request->user();
        $pengaduan = DB::table('pengaduan')->where('id_pengaduan', $id_pengaduan)->first();
        if (!$pengaduan) {
            return $this->tolakAkses('Pengaduan tidak ditemukan', 404);
        }
        // Chat hanya untuk pelapor & paralegal yang mengambil kasus
        if (!$this->menanganiPengaduan($user, $pengaduan)) {
            return $this->tolakAkses('Chat kasus ini hanya untuk pelapor dan paralegal yang menanganinya');
        }

        // Tandai semua pesan masuk dari lawan bicara sebagai telah dibaca
        DB::table('chat_pesan')
            ->where('id_pengaduan', $id_pengaduan)
            ->where('pengirim_id', '!=', $user->id_user)
            ->where('is_read', 0)
            ->update(['is_read' => 1]);

        $data = DB::table('chat_pesan')
            ->where('id_pengaduan', $id_pengaduan)
            ->orderBy('created_at', 'asc')
            ->get();
        return response()->json(['status' => true, 'message' => 'Berhasil', 'data' => $data]);
    }

    public function store(Request $request, $id_pengaduan)
    {
        $request->validate(['pesan' => 'required|string']);

        $pengaduan = DB::table('pengaduan')->where('id_pengaduan', $id_pengaduan)->first();
        if (!$pengaduan) {
            return $this->tolakAkses('Pengaduan tidak ditemukan', 404);
        }
        if (!$this->menanganiPengaduan($request->user(), $pengaduan)) {
            return $this->tolakAkses('Chat kasus ini hanya untuk pelapor dan paralegal yang menanganinya');
        }
        if ($pengaduan->status !== 'diproses') {
            return $this->tolakAkses('Kasus sudah ditutup, riwayat chat hanya bisa dibaca', 409);
        }

        $id = (string) Str::uuid();
        
        DB::table('chat_pesan')->insert([
            'id_pesan' => $id,
            'id_pengaduan' => $id_pengaduan,
            'pengirim_id' => $request->user()->id_user,
            'pengirim_nama' => $request->user()->nama_lengkap ?? 'User',
            'pengirim_role' => $request->user()->role,
            'isi_pesan' => $request->pesan,
            'lampiran_url' => null, 
            'is_read' => 0,
            'created_at' => now(),
        ]);

        // Kirim notifikasi ke lawan bicara perihal chat baru (Pop-up saja)
        try {
            if ($pengaduan) {
                $recipientId = ($request->user()->role === 'warga') 
                    ? $pengaduan->id_paralegal 
                    : $pengaduan->user_id;

                if ($recipientId) {
                    // Kirim push notification FCM (Pop-Up) jika fcm_token tersedia
                    $recipientUser = DB::table('users')->where('id_user', $recipientId)->first();
                    if ($recipientUser && !empty($recipientUser->fcm_token)) {
                        \App\Services\FcmService::sendPush(
                            $recipientUser->fcm_token,
                            'Pesan Baru',
                            ($request->user()->nama_lengkap ?? 'Lawan Bicara') . ': ' . $request->pesan,
                            [
                                'ref_table' => 'chat',
                                'ref_id' => $id_pengaduan,
                                'sender_name' => $request->user()->nama_lengkap ?? 'Lawan Bicara',
                                'judul_laporan' => $pengaduan->judul_pengaduan ?? 'Konsultasi Hukum',
                            ]
                        );
                    }
                }
            }
        } catch (\Exception $e) {
            // Abaikan error notifikasi agar chat tetap terkirim sukses
        }
        
        $data = DB::table('chat_pesan')->where('id_pesan', $id)->first();
        return response()->json(['status' => true, 'message' => 'Pesan terkirim', 'data' => $data], 201);
    }
}

