<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    /**
     * Tampilkan profil user yang sedang login (Semua Role).
     * Jika role adalah warga, sertakan data kependudukan dari tabel masyarakat.
     */
    public function show(Request $request)
    {
        $user = $request->user();

        $data = [
            'id_user'       => $user->id_user,
            'nama_lengkap'  => $user->nama_lengkap,
            'email'         => $user->email,
            'role'          => $user->role,
            'foto_profile'  => $user->foto_profile,
            'nomor_telepon' => $user->nomor_telepon,
            'status'        => $user->status,
            'created_at'    => $user->created_at ? $user->created_at->toIso8601String() : null,
            'updated_at'    => $user->updated_at ? $user->updated_at->toIso8601String() : null,
        ];

        // Jika warga, ambil relasi data kependudukan masyarakat beserta detail nama wilayah
        if ($user->role === 'warga') {
            $masyarakat = DB::table('masyarakat')
                ->where('id_user', $user->id_user)
                ->first();

            if ($masyarakat) {
                $kabupaten = null;
                if ($masyarakat->id_kabupaten) {
                    $kab = DB::table('kabupaten')->where('id_kabupaten', $masyarakat->id_kabupaten)->first();
                    if ($kab) {
                        $kabupaten = [
                            'id_kabupaten' => $kab->id_kabupaten,
                            'nama'         => $kab->nama
                        ];
                    }
                }

                $kecamatan = null;
                if ($masyarakat->id_kecamatan) {
                    $kec = DB::table('kecamatan')->where('id_kecamatan', $masyarakat->id_kecamatan)->first();
                    if ($kec) {
                        $kecamatan = [
                            'id_kecamatan' => $kec->id_kecamatan,
                            'nama'         => $kec->nama
                        ];
                    }
                }

                $kelurahan = null;
                if ($masyarakat->id_kelurahan) {
                    $kel = DB::table('kelurahan')->where('id_kelurahan', $masyarakat->id_kelurahan)->first();
                    if ($kel) {
                        $kelurahan = [
                            'id_kelurahan' => $kel->id_kelurahan,
                            'nama'         => $kel->nama
                        ];
                    }
                }

                $data['masyarakat'] = [
                    'id_user'      => $masyarakat->id_user,
                    'nik'          => $masyarakat->nik,
                    'alamat'       => $masyarakat->alamat,
                    'id_kabupaten' => $masyarakat->id_kabupaten,
                    'id_kecamatan' => $masyarakat->id_kecamatan,
                    'id_kelurahan' => $masyarakat->id_kelurahan,
                    'kabupaten'    => $kabupaten,
                    'kecamatan'    => $kecamatan,
                    'kelurahan'    => $kelurahan,
                ];
            } else {
                $data['masyarakat'] = null;
            }
        }

        return response()->json([
            'status'  => true,
            'message' => 'Profil berhasil dimuat',
            'data'    => $data
        ]);
    }

    /**
     * Perbarui profil user yang sedang login.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'nama_lengkap'  => 'required|string|max:255',
            'nomor_telepon' => 'nullable|string|max:30',
            'foto_profile'  => 'nullable|string',
            // Validasi field warga (masyarakat)
            'nik'           => 'nullable|string|max:30',
            'alamat'        => 'nullable|string',
            'id_kabupaten'  => 'nullable|string|exists:kabupaten,id_kabupaten',
            'id_kecamatan'  => 'nullable|string|exists:kecamatan,id_kecamatan',
            'id_kelurahan'  => 'nullable|string|exists:kelurahan,id_kelurahan',
        ]);

        return DB::transaction(function () use ($request, $user) {
            // Update data user utama
            $user->update([
                'nama_lengkap'  => $request->nama_lengkap,
                'nomor_telepon' => $request->nomor_telepon,
            ]);

            if ($request->has('foto_profile')) {
                $user->update([
                    'foto_profile' => $request->foto_profile
                ]);
            }

            // Update data kependudukan jika user adalah warga
            if ($user->role === 'warga') {
                DB::table('masyarakat')->updateOrInsert(
                    ['id_user' => $user->id_user],
                    [
                        'nik'          => $request->nik,
                        'alamat'       => $request->alamat,
                        'id_kabupaten' => $request->id_kabupaten,
                        'id_kecamatan' => $request->id_kecamatan,
                        'id_kelurahan' => $request->id_kelurahan,
                        'updated_at'   => now()
                    ]
                );
            }

            // Return data terbaru setelah update
            return $this->show($request);
        });
    }
}
