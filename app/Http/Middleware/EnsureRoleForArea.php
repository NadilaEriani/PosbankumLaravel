<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        if (in_array($role, self::PARALEGAL, true)) {
            // Posbankum paralegal = penugasan aktif. Tanpa itu filter posbankum di controller
            // akan kosong (= semua data), jadi area paralegal ditutup. Dipakai juga oleh /file-preview.
            $idPosbankum = DB::table('posbankum_paralegal')
                ->where('id_user', $request->user()->id_user)
                ->where('status', 'aktif')
                ->value('id_posbankum');

            abort_if(
                !$idPosbankum && $allowed === self::PARALEGAL,
                403,
                'Akun Anda belum ditugaskan ke Posbankum. Hubungi admin.'
            );

            $request->attributes->set('id_posbankum', $idPosbankum);
        }

        return $next($request);
    }
}
