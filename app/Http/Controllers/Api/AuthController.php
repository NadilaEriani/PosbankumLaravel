<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'nama_lengkap' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'nomor_telepon' => 'nullable|string',
        ]);

        $user = User::create([
            'id_user' => Str::uuid(),
            'nama_lengkap' => $request->nama_lengkap,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'role' => 'warga',
            'status' => 'aktif',
            'nomor_telepon' => $request->nomor_telepon,
        ]);

        $token = $user->createToken('flutter-app')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Registrasi berhasil',
            'data' => ['user' => $user, 'token' => $token]
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [strtolower($request->email)])->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json([
                'status' => false,
                'message' => 'Email atau password salah',
                'data' => null
            ], 401);
        }

        if ($user->status !== 'aktif') {
            return response()->json([
                'status' => false,
                'message' => 'Akun tidak aktif',
                'data' => null
            ], 403);
        }

        $token = $user->createToken('flutter-app')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Login berhasil',
            'data' => ['user' => $user, 'token' => $token]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json([
            'status' => true,
            'message' => 'Logout berhasil',
            'data' => null
        ]);
    }
}
