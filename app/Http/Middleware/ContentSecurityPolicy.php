<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * CSP halaman web. Skrip inline hanya boleh jalan bila membawa nonce per request
 * (Vite, Ziggy @routes, skrip audio di app.blade.php).
 *
 * Masih Report-Only: tidak memblokir apa pun, pelanggaran dikirim browser ke
 * POST /api/csp-report dan dicatat di laravel.log. Setelah beberapa hari tanpa
 * laporan dari fitur yang sah, ganti header ke 'Content-Security-Policy'.
 */
class ContentSecurityPolicy
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Vite::useCspNonce();

        $response = $next($request);

        if (!str_contains((string) $response->headers->get('Content-Type'), 'text/html')) {
            return $response;
        }

        // Saat `pnpm dev` lokal, skrip & HMR datang dari server Vite
        $dev = '';
        if (Vite::isRunningHot()) {
            $hot = rtrim(trim((string) @file_get_contents(Vite::hotFile())), '/');
            $dev = ' ' . $hot . ' ' . preg_replace('#^http#', 'ws', $hot);
        }

        $policy = [
            "default-src 'self'",
            "script-src 'self' 'nonce-{$nonce}' https://unpkg.com https://cdn.jsdelivr.net{$dev}",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.bunny.net https://unpkg.com https://cdn.jsdelivr.net{$dev}",
            "font-src 'self' data: https://fonts.gstatic.com https://fonts.bunny.net",
            "img-src 'self' data: blob: https://unpkg.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.googleusercontent.com",
            "connect-src 'self' https://nominatim.openstreetmap.org https://deeplearning.pcr.ac.id{$dev}",
            "frame-src 'self' blob: https://www.openstreetmap.org",
            "media-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
            'report-uri /api/csp-report',
        ];

        $response->headers->set('Content-Security-Policy-Report-Only', implode('; ', $policy));

        return $response;
    }
}
