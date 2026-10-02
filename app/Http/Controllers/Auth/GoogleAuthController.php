<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        /*
         * Kalau sebelumnya masih ada session login Laravel,
         * logout dulu supaya tidak langsung memakai akun lama.
         */
        if (Auth::check()) {
            Auth::logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        /*
         * Buat redirect ke Google lewat Socialite. Jika proses persiapan OAuth
         * gagal, tampilkan pesan yang juga mengarahkan pengguna mengecek jaringan.
         */
        try {
            $redirect = Socialite::driver('google')->redirect();

            /*
             * Tambahkan prompt=select_account tanpa memakai method with(),
             * karena method with() sering ditandai error oleh VS Code/Intelephense.
             */
            $redirect->setTargetUrl(
                $this->addQueryToUrl($redirect->getTargetUrl(), [
                    'prompt' => 'select_account',
                ]),
            );

            return $redirect;
        } catch (Throwable $e) {
            return redirect()
                ->route('login')
                ->withErrors([
                    'google' => 'Tidak dapat terhubung ke layanan Google. Periksa koneksi internet atau jaringan Anda, lalu coba lagi.',
                ]);
        }
    }

    public function callback(Request $request)
    {
        if ($request->has('error')) {
            return redirect()
                ->route('login')
                ->withErrors([
                    'email' => 'Login dibatalkan. Silakan pilih akun Google dan coba lagi.',
                ]);
        }

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable $e) {
            return redirect()
                ->route('login')
                ->withErrors([
                    'google' => 'Login dengan Google gagal karena layanan tidak dapat dihubungi. Periksa koneksi internet atau jaringan Anda, lalu coba lagi.',
                ]);
        }

        $email = strtolower(trim($googleUser->getEmail() ?? ''));

        if (!$email) {
            return redirect()
                ->route('login')
                ->withErrors([
                    'email' => 'Login gagal karena email akun Google tidak dapat dibaca. Silakan gunakan akun Google lain atau hubungi admin.',
                ]);
        }

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (!$user) {
            return redirect()
                ->route('login')
                ->withErrors([
                    'email' => 'Akun Google ini belum terdaftar di sistem. Silakan hubungi admin untuk mendapatkan akses.',
                ]);
        }

        if (Schema::hasColumn('users', 'status')) {
            $status = strtolower(trim((string) $user->status));

            if ($status && !in_array($status, ['aktif', 'active'], true)) {
                return redirect()
                    ->route('login')
                    ->withErrors([
                        'email' => 'Akun Anda sedang tidak aktif. Silakan hubungi admin untuk mengaktifkan kembali akun.',
                    ]);
            }
        }

        // Web hanya untuk admin & paralegal; warga memakai aplikasi mobile
        if (!in_array(strtolower(trim((string) $user->role)), ['admin', 'paralegal', 'posbankum'], true)) {
            return redirect()
                ->route('login')
                ->withErrors([
                    'email' => 'Akun warga hanya bisa login di aplikasi mobile SIBAPAK.',
                ]);
        }

        /*
         * false agar Laravel tidak mencoba mengisi remember_token.
         * Tabel users tuan sebelumnya tidak punya kolom remember_token.
         */
        Auth::login($user, false);

        $request->session()->regenerate();

        return redirect()->to($this->redirectByRole($user));
    }

    private function redirectByRole(User $user): string
    {
        $role = strtolower(trim((string) $user->role));

        if ($role === 'admin') {
            return route('admin.dashboard');
        }

        if ($role === 'paralegal' || $role === 'posbankum') {
            return route('posbankum.dashboard');
        }

        return route('home');
    }

    private function addQueryToUrl(string $url, array $query): string
    {
        $separator = str_contains($url, '?') ? '&' : '?';

        return $url . $separator . http_build_query($query);
    }
}