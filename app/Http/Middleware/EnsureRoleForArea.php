<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cek role berdasarkan area URL di grup route web yang butuh login:
 * - /admin*                   → hanya admin
 * - /paralegal*, /posbankum*  → hanya paralegal (role lama 'posbankum' ikut)
 * - lainnya (profil, file)    → admin atau paralegal; warga tidak memakai web
 * Berdasarkan prefix agar route baru di area itu otomatis ikut terlindungi.
 */
class EnsureRoleForArea
{
    private const PARALEGAL = ['paralegal', 'posbankum'];

    public function handle(Request $request, Closure $next): Response
    {
        $role = strtolower(trim((string) $request->user()?->role));

        $allowed = match (true) {
            $request->is('admin', 'admin/*') => ['admin'],
            $request->is('paralegal', 'paralegal/*', 'posbankum', 'posbankum/*') => self::PARALEGAL,
            default => ['admin', ...self::PARALEGAL],
        };

        abort_unless(in_array($role, $allowed, true), 403, 'Anda tidak memiliki akses ke halaman ini.');

        return $next($request);
    }
}
