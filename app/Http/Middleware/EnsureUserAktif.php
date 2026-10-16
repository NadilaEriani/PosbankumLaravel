<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tolak request dari akun yang dinonaktifkan admin.
 * - API: cabut token yang dipakai, 401 → aplikasi mobile kembali ke halaman login.
 * - Web (dipasang di grup web): putus sesi yang masih hidup, kembali ke halaman login.
 * Tanpa ini token/sesi lama tetap berlaku walau status user sudah 'nonaktif'.
 */
class EnsureUserAktif
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $status = strtolower(trim((string) ($user?->status ?? '')));

        if ($user && $status !== '' && !in_array($status, ['aktif', 'active'], true)) {
            if ($request->is('api/*')) {
                $user->currentAccessToken()?->delete();

                return response()->json([
                    'status'  => false,
                    'message' => 'Akun Anda sedang dinonaktifkan. Hubungi admin.',
                    'data'    => null,
                ], 401);
            }

            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'email' => 'Akun Anda sedang tidak aktif. Silakan hubungi admin untuk mengaktifkan kembali akun.',
            ]);
        }

        return $next($request);
    }
}
