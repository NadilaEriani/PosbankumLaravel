<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    /**
     * Display the password reset view.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]);
    }

    /**
     * Handle an incoming new password request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $payload = [];

                if (Schema::hasColumn('users', 'password_hash')) {
                    $payload['password_hash'] = Hash::make($request->password);
                }

                if (Schema::hasColumn('users', 'password')) {
                    $payload['password'] = Hash::make($request->password);
                }

                if (Schema::hasColumn('users', 'remember_token')) {
                    $payload['remember_token'] = \Illuminate\Support\Str::random(60);
                }

                if (Schema::hasColumn('users', 'updated_at')) {
                    $payload['updated_at'] = now();
                }

                if (empty($payload)) {
                    throw ValidationException::withMessages([
                        'password' => 'Kolom password belum tersedia pada tabel users.',
                    ]);
                }

                $user->forceFill($payload)->save();

                event(new PasswordReset($user));
            }
        );

        if ($status == Password::PASSWORD_RESET) {
            return redirect()->route('login')->with('status', __($status));
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }
}
