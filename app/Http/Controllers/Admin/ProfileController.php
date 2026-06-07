<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Alias lama agar route/cache lama yang masih memanggil updateAdmin tetap aman.
     */
    public function updateAdmin(Request $request): RedirectResponse
    {
        return $this->adminProfileUpdate($request);
    }

    /**
     * Update admin profile from admin profile page.
     */
    public function adminProfileUpdate(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        $userKeyColumn = $this->userKeyColumn();
        $userKey = $this->userKeyValue($user, $userKeyColumn);

        $data = $request->validate(
            [
                'full_name' => ['required', 'string', 'min:3', 'max:255'],
                'nip' => ['nullable', 'string', 'max:50'],
                'email_kantor' => [
                    'required',
                    'email',
                    'max:255',
                    Rule::unique('users', 'email')->ignore($userKey, $userKeyColumn),
                ],
                'nomor_telepon' => ['nullable', 'string', 'max:25'],
                'nomor_kantor' => ['nullable', 'string', 'max:30'],
                'jabatan' => ['nullable', 'string', 'max:120'],
                'unit_kerja' => ['nullable', 'string', 'max:255'],
                'alamat_kantor' => ['nullable', 'string', 'max:1000'],
                'foto_profile' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
                'remove_photo' => ['nullable', 'boolean'],
            ],
            [
                'full_name.required' => 'Nama lengkap wajib diisi.',
                'full_name.min' => 'Nama lengkap minimal 3 karakter.',
                'email_kantor.required' => 'Email wajib diisi.',
                'email_kantor.email' => 'Format email tidak valid.',
                'email_kantor.unique' => 'Email ini sudah digunakan akun lain.',
                'foto_profile.image' => 'File foto harus berupa gambar.',
                'foto_profile.mimes' => 'Format foto harus PNG, JPG, atau JPEG.',
                'foto_profile.max' => 'Ukuran foto maksimal 5MB.',
            ]
        );

        $payload = [];

        $fullName = trim($data['full_name']);
        $email = strtolower(trim($data['email_kantor']));

        $this->addColumn($payload, 'users', 'nama_lengkap', $fullName);
        $this->addColumn($payload, 'users', 'name', $fullName);
        $this->addColumn($payload, 'users', 'email', $email);
        $this->addColumn($payload, 'users', 'email_kantor', $email);
        $this->addColumn($payload, 'users', 'nip', $this->blankToNull($data['nip'] ?? null));
        $this->addColumn($payload, 'users', 'nomor_telepon', $this->blankToNull($data['nomor_telepon'] ?? null));
        $this->addColumn($payload, 'users', 'nomor_kantor', $this->blankToNull($data['nomor_kantor'] ?? null));
        $this->addColumn($payload, 'users', 'jabatan', $this->blankToNull($data['jabatan'] ?? null));
        $this->addColumn($payload, 'users', 'unit_kerja', $this->blankToNull($data['unit_kerja'] ?? null));
        $this->addColumn($payload, 'users', 'alamat_kantor', $this->blankToNull($data['alamat_kantor'] ?? null));

        $oldPhoto = (string) ($user->foto_profile ?? '');
        $nextPhoto = $oldPhoto;
        $removePhoto = $request->boolean('remove_photo');

        if ($request->hasFile('foto_profile')) {
            $nextPhoto = $this->storeProfilePhoto($request, $userKey);
            $this->addColumn($payload, 'users', 'foto_profile', $nextPhoto);
        } elseif ($removePhoto) {
            $nextPhoto = '';
            $this->addColumn($payload, 'users', 'foto_profile', null);
        }

        $this->addColumn($payload, 'users', 'updated_at', now());

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'database' => 'Tidak ada kolom profil yang bisa diperbarui pada tabel users.',
            ]);
        }

        DB::table('users')
            ->where($userKeyColumn, $userKey)
            ->update($payload);

        if (($request->hasFile('foto_profile') || $removePhoto) && $oldPhoto && $oldPhoto !== $nextPhoto) {
            $this->deleteProfilePhoto($oldPhoto);
        }

        return redirect()
            ->back()
            ->with('success', 'Profil admin berhasil diperbarui.');
    }

    /**
     * Alias lama agar route/cache lama yang masih memanggil updateAdminPassword tetap aman.
     */
    public function updateAdminPassword(Request $request): RedirectResponse
    {
        return $this->adminProfilePasswordUpdate($request);
    }

    /**
     * Update admin password from admin profile page.
     */
    public function adminProfilePasswordUpdate(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        if ($request->has('currentPassword')) {
            $request->merge([
                'current_password' => $request->input('currentPassword'),
                'password' => $request->input('newPassword'),
                'password_confirmation' => $request->input('confirmPassword'),
            ]);
        }

        $data = $request->validate(
            [
                'current_password' => ['required', 'string'],
                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                    'regex:/[A-Z]/',
                    'regex:/[a-z]/',
                    'regex:/[0-9]/',
                ],
            ],
            [
                'current_password.required' => 'Password saat ini wajib diisi.',
                'password.required' => 'Password baru wajib diisi.',
                'password.min' => 'Password baru minimal 8 karakter.',
                'password.confirmed' => 'Konfirmasi password belum sama.',
                'password.regex' => 'Password harus mengandung huruf besar, huruf kecil, dan angka.',
            ]
        );

        $currentHash = $user->password_hash ?? $user->password ?? null;

        if (!$currentHash || !Hash::check($data['current_password'], $currentHash)) {
            throw ValidationException::withMessages([
                'current_password' => 'Password saat ini tidak sesuai.',
            ]);
        }

        $payload = [];
        $hashedPassword = Hash::make($data['password']);

        $this->addColumn($payload, 'users', 'password_hash', $hashedPassword);
        $this->addColumn($payload, 'users', 'password', $hashedPassword);
        $this->addColumn($payload, 'users', 'updated_at', now());

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'password' => 'Kolom password belum tersedia pada tabel users.',
            ]);
        }

        $userKeyColumn = $this->userKeyColumn();

        DB::table('users')
            ->where($userKeyColumn, $this->userKeyValue($user, $userKeyColumn))
            ->update($payload);

        return redirect()
            ->back()
            ->with('success', 'Password berhasil diperbarui.');
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

    private function hasColumn(string $table, string $column): bool
    {
        return Schema::hasTable($table) && Schema::hasColumn($table, $column);
    }

    private function addColumn(array &$payload, string $table, string $column, mixed $value): void
    {
        if ($this->hasColumn($table, $column)) {
            $payload[$column] = $value;
        }
    }

    private function userKeyColumn(): string
    {
        if ($this->hasColumn('users', 'id_user')) {
            return 'id_user';
        }

        return 'id';
    }

    private function userKeyValue(object $user, string $userKeyColumn): mixed
    {
        return $user->{$userKeyColumn}
            ?? $user->id_user
            ?? $user->id
            ?? $user->getKey();
    }

    private function blankToNull(mixed $value): ?string
    {
        $clean = trim((string) ($value ?? ''));

        return $clean === '' ? null : $clean;
    }

    private function storeProfilePhoto(Request $request, mixed $userKey): string
    {
        $file = $request->file('foto_profile');
        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = Str::uuid()->toString() . '.' . $extension;
        $folder = 'profile-photos/admin/' . preg_replace('/[^A-Za-z0-9_\-]/', '-', (string) $userKey);

        return $file->storeAs($folder, $filename, 'public');
    }

    private function deleteProfilePhoto(string $path): void
    {
        $cleanPath = trim($path);

        if (
            $cleanPath === '' ||
            preg_match('/^https?:\/\//i', $cleanPath) ||
            preg_match('/^(data:|blob:)/i', $cleanPath)
        ) {
            return;
        }

        $cleanPath = str_replace('\\', '/', $cleanPath);
        $cleanPath = preg_replace('#^/storage/#', '', $cleanPath);
        $cleanPath = preg_replace('#^storage/#', '', $cleanPath);
        $cleanPath = preg_replace('#^public/#', '', $cleanPath);

        if ($cleanPath && Storage::disk('public')->exists($cleanPath)) {
            Storage::disk('public')->delete($cleanPath);
        }
    }
}