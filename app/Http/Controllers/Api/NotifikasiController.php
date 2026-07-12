<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotifikasiController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = DB::table('notifikasi')->where('kategori', '!=', 'dokumen');

        if ($user->role === 'paralegal') {
            $idPosbankum = DB::table('posbankum_paralegal')
                ->where('id_user', $user->id_user)
                ->where('status', 'aktif')
                ->value('id_posbankum');

            $query->where(function ($q) use ($idPosbankum, $user) {
                if ($idPosbankum) {
                    $q->where('id_posbankum', $idPosbankum);
                }
                $q->orWhere('id_user_penerima', $user->id_user);
            });
        } else {
            $userId = $user->id_user ?? $user->id;
            $query->where('id_user_penerima', $userId);
        }

        $data = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status'  => true,
            'message' => 'Berhasil',
            'data'    => $data,
        ]);
    }

    public function markRead($id)
    {
        DB::table('notifikasi')
            ->where('id_notifikasi', $id)
            ->update([
                'is_read' => 1,
                'read_at' => now(),
            ]);

        return response()->json([
            'status'  => true,
            'message' => 'Notifikasi ditandai dibaca',
            'data'    => null,
        ]);
    }

    public function unreadCount(Request $request)
    {
        $user = $request->user();
        $query = DB::table('notifikasi')->where('is_read', 0)->where('kategori', '!=', 'dokumen');

        if ($user->role === 'paralegal') {
            $idPosbankum = DB::table('posbankum_paralegal')
                ->where('id_user', $user->id_user)
                ->where('status', 'aktif')
                ->value('id_posbankum');

            $query->where(function ($q) use ($idPosbankum, $user) {
                if ($idPosbankum) {
                    $q->where('id_posbankum', $idPosbankum);
                }
                $q->orWhere('id_user_penerima', $user->id_user);
            });
        } else {
            $userId = $user->id_user ?? $user->id;
            $query->where('id_user_penerima', $userId);
        }

        $count = $query->count();

        return response()->json([
            'status'  => true,
            'message' => 'Berhasil',
            'data'    => [
                'unread_count' => $count,
            ],
        ]);
    }

    public function markAllRead(Request $request)
    {
        $user = $request->user();
        $query = DB::table('notifikasi')->where('is_read', 0)->where('kategori', '!=', 'dokumen');

        if ($user->role === 'paralegal') {
            $idPosbankum = DB::table('posbankum_paralegal')
                ->where('id_user', $user->id_user)
                ->where('status', 'aktif')
                ->value('id_posbankum');

            $query->where(function ($q) use ($idPosbankum, $user) {
                if ($idPosbankum) {
                    $q->where('id_posbankum', $idPosbankum);
                }
                $q->orWhere('id_user_penerima', $user->id_user);
            });
        } else {
            $userId = $user->id_user ?? $user->id;
            $query->where('id_user_penerima', $userId);
        }

        $query->update([
            'is_read' => 1,
            'read_at' => now(),
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Semua notifikasi ditandai dibaca',
            'data'    => null,
        ]);
    }
}
