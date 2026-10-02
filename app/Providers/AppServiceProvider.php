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
            $email = Str::lower((string) $request->input('email'));

            return $email !== ''
                ? Limit::perMinute(5)->by($email . '|' . $request->ip())
                : Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        // Request terautentikasi per user. Polling chat (3 dtk) + daftar chat (10 dtk) ≈ 26/menit.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(300)->by($request->user()?->id_user ?: $request->ip()));
    }
}
