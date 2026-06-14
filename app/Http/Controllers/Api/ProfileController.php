<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json([
            'status' => true,
            'message' => 'Berhasil',
            'data' => $request->user()
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'nama_lengkap' => 'sometimes|string|max:255',
            'nomor_telepon' => 'sometimes|string|max:30',
            'alamat_kantor' => 'sometimes|string',
        ]);

        $user->update($request->only(['nama_lengkap', 'nomor_telepon', 'alamat_kantor']));

        return response()->json([
            'status' => true,
            'message' => 'Profil berhasil diupdate',
            'data' => $user
        ]);
    }
}
