<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function googleCallback(Request $request)
    {
        $request->validate(['id_token' => 'required|string']);

        $response = Http::get("https://oauth2.googleapis.com/tokeninfo?id_token=" . $request->id_token);
        
        if ($response->failed()) {
            return response()->json(['status' => false, 'message' => 'Token Google tidak valid'], 401);
        }

        $googleData = $response->json();
        $email = $googleData['email'];
        $googleId = $googleData['sub'];

        return DB::transaction(function () use ($email, $googleId, $googleData) {
            // GUNAKAN where()->first() -- Jangan pakai find atau binding yang bisa memicu 404 otomatis
            $user = User::where('google_id', $googleId)
                        ->orWhere('email', $email)
                        ->first();

            if (!$user) {
                // Simpan User Baru
                $user = User::create([
                    'nama_lengkap'  => $googleData['name'],
                    'email'         => $email,
                    'google_id'     => $googleId,
                    'password_hash' => Hash::make(Str::random(16)),
                    'role'          => 'warga',
                    'status'        => 'aktif',
                    'foto_profile'  => $googleData['picture'] ?? null,
                ]);

                // Query ulang data user berdasarkan email agar ID UUID dari trigger DB terbaca
                $user = User::where('email', $email)->first(); 

                // Insert ke Masyarakat
                DB::table('masyarakat')->updateOrInsert(
                    ['id_user' => $user->id_user],
                    [
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            } else {
                $user->update(['google_id' => $googleId]);
            }

            $token = $user->createToken('flutter-app')->plainTextToken;

            return response()->json([
                'status' => true,
                'message' => 'Login Google berhasil',
                'data' => [
                    'token' => $token,
                    'user'  => [
                        'id_user' => $user->id_user,
                        'nama_lengkap' => $user->nama_lengkap,
                        'role' => $user->role,
                        'email' => $user->email
                    ]
                ]
            ]);
        });
    }
    
    public function register(Request $request)
    {
        $request->validate([
            'nama_lengkap' => 'required|string|max:255',
            'email'        => 'required|email|unique:users,email',
            'password'     => 'required|min:6',
        ]);

        return DB::transaction(function () use ($request) {
            $user = User::create([
                'nama_lengkap'  => $request->nama_lengkap,
                'email'         => $request->email,
                'password_hash' => Hash::make($request->password),
                'role'          => 'warga',
                'status'        => 'aktif',
            ]);

            // Query ulang data user berdasarkan email agar ID UUID dari trigger DB terbaca
            $user = User::where('email', $request->email)->first();

            DB::table('masyarakat')->insert([
                'id_user'    => $user->id_user,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $token = $user->createToken('flutter-app')->plainTextToken;

            return response()->json([
                'status' => true,
                'message' => 'Registrasi berhasil',
                'data' => [
                    'token' => $token,
                    'user'  => $this->formatUserResponse($user)
                ]
            ], 201);
        });
    }

    public function login(Request $request)
    {
        $request->validate(['email' => 'required|email', 'password' => 'required']);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json(['status' => false, 'message' => 'Email atau password salah'], 401);
        }

        $token = $user->createToken('flutter-app')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Login berhasil',
            'data' => [
                'token' => $token,
                'user'  => $this->formatUserResponse($user)
            ]
        ]);
    }

    /**
     * Helper untuk filter field sensitif
     */
    private function formatUserResponse($user)
    {
        return [
            'id_user'       => $user->id_user,
            'nama_lengkap'  => $user->nama_lengkap,
            'email'         => $user->email,
            'role'          => $user->role,
            'foto_profile'  => $user->foto_profile,
            'nomor_telepon' => $user->nomor_telepon,
            'status'        => $user->status,
        ];
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['status' => true, 'message' => 'Logout berhasil']);
    }
}