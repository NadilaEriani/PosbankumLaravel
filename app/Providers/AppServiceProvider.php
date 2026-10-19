<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Anti brute force login API. Login Google tidak membawa email → per IP, dibuat
        // lebih longgar karena banyak HP bisa berbagi satu IP (Wi-Fi kampus / NAT).
        RateLimiter::for('login', function (Request $request) {
            // transliterate: varian beraksen (mis. 'ä') = akun yang sama bagi collation DB,
            // jadi harus satu ember limiter juga
            $email = Str::transliterate(Str::lower((string) $request->input('email')));

            return $email !== ''
                ? Limit::perMinute(5)->by($email . '|' . $request->ip())
                : Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        // Laporan CSP dari browser: satu halaman bisa mengirim beberapa sekaligus
        RateLimiter::for('csp', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));

        // Buat pengaduan: tiap pengaduan mengirim push ke semua paralegal kelurahan → cegah spam
        RateLimiter::for('pengaduan', fn (Request $request) => Limit::perHour(5)
            ->by($request->user()?->id_user ?: $request->ip())
            ->response(fn () => response()->json([
                'status' => false,
                'message' => 'Batas pembuatan pengaduan tercapai (5 per jam). Silakan coba lagi nanti.',
                'data' => null,
            ], 429)));

        // Request terautentikasi per user. Polling chat (3 dtk) + daftar chat (10 dtk) ≈ 26/menit.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(300)->by($request->user()?->id_user ?: $request->ip()));
    }
}
