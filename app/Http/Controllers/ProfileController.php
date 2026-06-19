<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $payload = [];

        if (array_key_exists('name', $validated)) {
            if (Schema::hasColumn('users', 'nama_lengkap')) {
                $payload['nama_lengkap'] = $validated['name'];
            }

            if (Schema::hasColumn('users', 'name')) {
                $payload['name'] = $validated['name'];
            }
        }

        if (array_key_exists('email', $validated) && Schema::hasColumn('users', 'email')) {
            $payload['email'] = $validated['email'];
        }

        if (!empty($payload['email']) && $request->user()->email !== $payload['email'] && Schema::hasColumn('users', 'email_verified_at')) {
            $payload['email_verified_at'] = null;
        }

        if (Schema::hasColumn('users', 'updated_at')) {
            $payload['updated_at'] = now();
        }

        if (!empty($payload)) {
            $request->user()->forceFill($payload)->save();
        }

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
