<?php
namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Aturan akses pengaduan untuk API mobile (model "satu kasus, satu paralegal").
 * - Lihat detail/lampiran/timeline: warga pemilik, paralegal yang menangani,
 *   atau paralegal aktif di posbankum kelurahan pelapor (agar kasus 'menunggu' bisa ditinjau).
 * - Menangani (chat, timeline, upload lampiran): hanya warga pemilik dan
 *   paralegal yang mengambil kasus (pengaduan.id_paralegal).
 */
trait AksesPengaduan
{
    protected function bisaLihatPengaduan($user, $pengaduan): bool
    {
        if ($user->role === 'admin' || $this->menanganiPengaduan($user, $pengaduan)) {
            return true;
        }

        return $user->role === 'paralegal' && $this->pengaduanDiWilayahParalegal($user, $pengaduan);
    }

    protected function menanganiPengaduan($user, $pengaduan): bool
    {
        return match ($user->role) {
            'warga'     => $pengaduan->user_id === $user->id_user,
            'paralegal' => $pengaduan->id_paralegal === $user->id_user,
            default     => false,
        };
    }

    // Kelurahan pelapor = kelurahan salah satu posbankum aktif tempat paralegal bertugas
    protected function pengaduanDiWilayahParalegal($user, $pengaduan): bool
    {
        return DB::table('masyarakat as m')
            ->join('posbankum as pos', 'pos.id_kelurahan', '=', 'm.id_kelurahan')
            ->join('posbankum_paralegal as pp', 'pp.id_posbankum', '=', 'pos.id_posbankum')
            ->where('m.id_user', $pengaduan->user_id)
            ->where('pp.id_user', $user->id_user)
            ->where('pp.status', 'aktif')
            ->exists();
    }

    protected function tolakAkses(string $pesan = 'Anda tidak memiliki akses ke pengaduan ini', int $kode = 403)
    {
        return response()->json(['status' => false, 'message' => $pesan, 'data' => null], $kode);
    }
}
