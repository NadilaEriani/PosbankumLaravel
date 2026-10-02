<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tolak request API dari akun yang dinonaktifkan admin, sekaligus cabut tokennya.
 * Tanpa ini token lama tetap berlaku walau status user sudah 'nonaktif'.
 * 401 → aplikasi mobile kembali ke halaman login.
 */
class EnsureUserAktif
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $status = strtolower(trim((string) ($user?->status ?? '')));

        if ($user && $status !== '' && !in_array($status, ['aktif', 'active'], true)) {
            $user->currentAccessToken()?->delete();

            return response()->json([
                'status'  => false,
                'message' => 'Akun Anda sedang dinonaktifkan. Hubungi admin.',
                'data'    => null,
            ], 401);
        }

        return $next($request);
    }
}
