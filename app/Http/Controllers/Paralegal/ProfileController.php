<?php

namespace App\Http\Controllers\Paralegal;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProfileController extends Controller
{
    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function hasColumn(string $table, string $column): bool
    {
        return $this->hasTable($table) && Schema::hasColumn($table, $column);
    }

    private function firstExistingColumn(string $table, array $columns): ?string
    {
        foreach ($columns as $column) {
            if ($this->hasColumn($table, $column)) {
                return $column;
            }
        }

        return null;
    }

    private function addIfExists(array &$payload, string $table, string $column, mixed $value): void
    {
        if ($this->hasColumn($table, $column)) {
            $payload[$column] = $value;
        }
    }

    private function currentUserId($user): mixed
    {
        if (!$user) {
            return null;
        }

        foreach (['id_user', 'id'] as $key) {
            if (!empty($user->{$key})) {
                return $user->{$key};
            }
        }

        return null;
    }

    private function updateParalegalMemberRows($user, string $name, ?string $phone): void
    {
        if (!$this->hasTable('paralegal_members')) {
            return;
        }

        $queries = [];
        $userId = $this->currentUserId($user);

        if ($userId && $this->hasColumn('paralegal_members', 'id_user')) {
            $queries[] = DB::table('paralegal_members')->where('id_user', $userId);
        }

        if ($userId && $this->hasColumn('paralegal_members', 'user_id')) {
            $queries[] = DB::table('paralegal_members')->where('user_id', $userId);
        }

        foreach (['email', 'email_akun', 'email_paralegal'] as $column) {
            if (!empty($user->email) && $this->hasColumn('paralegal_members', $column)) {
                $queries[] = DB::table('paralegal_members')->where($column, $user->email);
            }
        }

        if (empty($queries)) {
            return;
        }

        $payload = [];
        foreach (['nama_paralegal', 'nama_lengkap', 'nama', 'name'] as $column) {
            $this->addIfExists($payload, 'paralegal_members', $column, $name);
        }

        foreach (['nomor_telepon', 'phone', 'nomor_tlp', 'telp'] as $column) {
            $this->addIfExists($payload, 'paralegal_members', $column, $phone);
        }

        $this->addIfExists($payload, 'paralegal_members', 'updated_at', now());

        if (empty($payload)) {
            return;
        }

        foreach ($queries as $query) {
            $query->update($payload);
        }
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $userId = $this->currentUserId($user);

        if (!$user || !$userId) {
            return back()->withErrors([
                'profile' => 'Akun paralegal tidak ditemukan. Silakan login ulang.',
            ]);
        }

        if (!$this->hasTable('users')) {
            return back()->withErrors([
                'profile' => 'Tabel users tidak ditemukan.',
            ]);
        }

        $idColumn = $this->firstExistingColumn('users', ['id_user', 'id']);

        if (!$idColumn) {
            return back()->withErrors([
                'profile' => 'Kolom ID user tidak ditemukan.',
            ]);
        }

        $validated = $request->validate([
            'nama_lengkap' => ['required', 'string', 'max:255'],
            'nomor_telepon' => ['nullable', 'string', 'max:50'],
        ]);

        $name = trim((string) $validated['nama_lengkap']);
        $phone = trim((string) ($validated['nomor_telepon'] ?? '')) ?: null;

        $payload = [];
        $this->addIfExists($payload, 'users', 'nama_lengkap', $name);
        $this->addIfExists($payload, 'users', 'name', $name);
        $this->addIfExists($payload, 'users', 'nomor_telepon', $phone);
        $this->addIfExists($payload, 'users', 'phone', $phone);
        $this->addIfExists($payload, 'users', 'updated_at', now());

        if (empty($payload)) {
            return back()->withErrors([
                'profile' => 'Tidak ada kolom profil paralegal yang bisa diperbarui.',
            ]);
        }

        $updated = DB::table('users')
            ->where($idColumn, $userId)
            ->where(function ($query) {
                if ($this->hasColumn('users', 'role')) {
                    $query->whereIn('role', ['paralegal', 'posbankum']);
                }
            })
            ->update($payload);

        if (!$updated) {
            return back()->withErrors([
                'profile' => 'Profil paralegal tidak ditemukan atau tidak bisa diperbarui.',
            ]);
        }

        $this->updateParalegalMemberRows($user, $name, $phone);

        return back()->with('success', 'Profil paralegal berhasil diperbarui.');
    }
}
