<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tolak request dari akun yang dinonaktifkan admin.
 * - API: cabut token yang dipakai, 401 → aplikasi mobile kembali ke halaman login.
 * - Web (dipasang di grup web): putus sesi yang masih hidup (juga bila email akun diganti
 *   admin), kembali ke halaman login.
 * Tanpa ini token/sesi lama tetap berlaku walau status user sudah 'nonaktif'.
 */
class EnsureUserAktif
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $status = strtolower(trim((string) ($user?->status ?? '')));
        $nonaktif = $user && $status !== '' && !in_array($status, ['aktif', 'active'], true);

        // Sesi web dicap dengan email saat dipakai pertama kali. Kalau admin mengganti email
        // akun ini, sesi milik pemegang email lama ikut diputus.
        $emailBerubah = false;
        if ($user && !$request->is('api/*') && $request->hasSession()) {
            $cap = $user->id_user . '|' . strtolower(trim((string) $user->email));
            $capLama = (string) $request->session()->get('auth_cap', '');

            if ($capLama !== '' && str_starts_with($capLama, $user->id_user . '|') && $capLama !== $cap) {
                $emailBerubah = true;
            } else {
                $request->session()->put('auth_cap', $cap);
            }
        }

        if ($nonaktif || $emailBerubah) {
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
                'email' => $nonaktif
                    ? 'Akun Anda sedang tidak aktif. Silakan hubungi admin untuk mengaktifkan kembali akun.'
                    : 'Sesi berakhir karena data akun berubah. Silakan login kembali.',
            ]);
        }

        return $next($request);
    }
}
