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
        $query = DB::table('notifikasi');

        if ($user->role === 'paralegal' || !empty($user->id_posbankum)) {
            $query->where('id_posbankum', $user->id_posbankum);
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
        $query = DB::table('notifikasi')->where('is_read', 0);

        if ($user->role === 'paralegal' || !empty($user->id_posbankum)) {
            $query->where('id_posbankum', $user->id_posbankum);
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
        $query = DB::table('notifikasi')->where('is_read', 0);

        if ($user->role === 'paralegal' || !empty($user->id_posbankum)) {
            $query->where('id_posbankum', $user->id_posbankum);
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
