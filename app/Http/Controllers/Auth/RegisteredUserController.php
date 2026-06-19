<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $payload = [];

        if (Schema::hasColumn('users', 'id_user')) {
            $payload['id_user'] = (string) Str::uuid();
        }

        if (Schema::hasColumn('users', 'nama_lengkap')) {
            $payload['nama_lengkap'] = $request->name;
        }

        if (Schema::hasColumn('users', 'name')) {
            $payload['name'] = $request->name;
        }

        if (Schema::hasColumn('users', 'email')) {
            $payload['email'] = $request->email;
        }

        if (Schema::hasColumn('users', 'password_hash')) {
            $payload['password_hash'] = Hash::make($request->password);
        }

        if (Schema::hasColumn('users', 'password')) {
            $payload['password'] = Hash::make($request->password);
        }

        if (Schema::hasColumn('users', 'role')) {
            $payload['role'] = 'warga';
        }

        if (Schema::hasColumn('users', 'status')) {
            $payload['status'] = 'aktif';
        }

        if (Schema::hasColumn('users', 'created_at')) {
            $payload['created_at'] = now();
        }

        if (Schema::hasColumn('users', 'updated_at')) {
            $payload['updated_at'] = now();
        }

        if (empty($payload) || (!isset($payload['password_hash']) && !isset($payload['password']))) {
            throw ValidationException::withMessages([
                'database' => 'Kolom akun pengguna belum sesuai untuk registrasi.',
            ]);
        }

        $user = User::create($payload);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
