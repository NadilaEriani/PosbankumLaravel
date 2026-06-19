<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class PasswordController extends Controller
{
    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $payload = [];

        if (Schema::hasColumn('users', 'password_hash')) {
            $payload['password_hash'] = Hash::make($validated['password']);
        }

        if (Schema::hasColumn('users', 'password')) {
            $payload['password'] = Hash::make($validated['password']);
        }

        if (Schema::hasColumn('users', 'updated_at')) {
            $payload['updated_at'] = now();
        }

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'password' => 'Kolom password belum tersedia pada tabel users.',
            ]);
        }

        $request->user()->forceFill($payload)->save();

        return back();
    }
}
