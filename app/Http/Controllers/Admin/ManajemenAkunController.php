<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ManajemenAkunController extends Controller
{
    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function hasColumn(string $table, string $column): bool
    {
        return $this->hasTable($table) && Schema::hasColumn($table, $column);
    }

    private function columnMeta(string $table, string $column): ?object
    {
        if (!$this->hasColumn($table, $column)) {
            return null;
        }

        return DB::selectOne(
            "
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
            LIMIT 1
            ",
            [$table, $column]
        );
    }

    private function isAutoIncrement(string $table, string $column): bool
    {
        $meta = $this->columnMeta($table, $column);

        if (!$meta) {
            return false;
        }

        return str_contains(strtolower((string) $meta->EXTRA), 'auto_increment');
    }

    private function userKeyColumn(): string
    {
        if ($this->hasColumn('users', 'id_user')) {
            return 'id_user';
        }

        return 'id';
    }

    private function addColumn(array &$payload, string $table, string $column, mixed $value): void
    {
        if ($this->hasColumn($table, $column)) {
            $payload[$column] = $value;
        }
    }

    private function validateRequest(Request $request, ?string $idUser = null): array
    {
        $userKeyColumn = $this->userKeyColumn();

        $rules = [
            'nama_lengkap' => ['required', 'string', 'min:3', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($idUser, $userKeyColumn),
            ],
            'nomor_telepon' => ['nullable', 'string', 'max:15', 'regex:/^[0-9]{8,15}$/'],
            'id_kabupaten' => ['required', 'string', Rule::exists('kabupaten', 'id_kabupaten')],
            'id_kecamatan' => ['required', 'string', Rule::exists('kecamatan', 'id_kecamatan')],
            'id_kelurahan' => ['required', 'string', Rule::exists('kelurahan', 'id_kelurahan')],
            'id_posbankum' => ['nullable', 'string', Rule::exists('posbankum', 'id_posbankum')],
        ];

        $messages = [
            'nama_lengkap.required' => 'Nama paralegal wajib diisi.',
            'nama_lengkap.min' => 'Nama paralegal minimal 3 karakter.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah digunakan akun lain.',
            'nomor_telepon.regex' => 'Nomor telepon harus berisi 8 sampai 15 digit angka.',
            'nomor_telepon.max' => 'Nomor telepon maksimal 15 digit.',
            'id_kabupaten.required' => 'Kabupaten wajib dipilih.',
            'id_kecamatan.required' => 'Kecamatan wajib dipilih.',
            'id_kelurahan.required' => 'Kelurahan wajib dipilih.',
            'id_kabupaten.exists' => 'Kabupaten tidak ditemukan di database.',
            'id_kecamatan.exists' => 'Kecamatan tidak ditemukan di database.',
            'id_kelurahan.exists' => 'Kelurahan tidak ditemukan di database.',
            'id_posbankum.exists' => 'Posbankum tidak ditemukan di database.',
        ];

        $data = Validator::make($request->all(), $rules, $messages)->validate();

        $data['nomor_telepon'] = $data['nomor_telepon'] ?? null;
        $data['id_posbankum'] = $this->resolvePosbankumId($data);

        $this->validateWilayahPosbankum($data);

        return $data;
    }

    private function resolvePosbankumId(array $data): string
    {
        if (!empty($data['id_posbankum'])) {
            $posbankum = DB::table('posbankum')
                ->where('id_posbankum', $data['id_posbankum'])
                ->first();

            if ($posbankum) {
                return (string) $posbankum->id_posbankum;
            }
        }

        if (!$this->hasColumn('posbankum', 'id_kelurahan')) {
            throw ValidationException::withMessages([
                'id_posbankum' => 'Kolom id_kelurahan belum tersedia pada tabel posbankum.',
            ]);
        }

        $posbankum = DB::table('posbankum')
            ->where('id_kelurahan', $data['id_kelurahan'])
            ->orderBy('nama')
            ->first();

        if ($posbankum) {
            return (string) $posbankum->id_posbankum;
        }

        $kelurahan = DB::table('kelurahan')
            ->where('id_kelurahan', $data['id_kelurahan'])
            ->first();

        if (!$kelurahan) {
            throw ValidationException::withMessages([
                'id_kelurahan' => 'Kelurahan tidak ditemukan di database.',
            ]);
        }

        $payload = [
            'id_kelurahan' => $data['id_kelurahan'],
            'nama' => $kelurahan->nama,
        ];

        if ($this->hasColumn('posbankum', 'status_verifikasi_tagging_area')) {
            $payload['status_verifikasi_tagging_area'] = 'disetujui';
        }

        if ($this->hasColumn('posbankum', 'created_at')) {
            $payload['created_at'] = now();
        }

        if ($this->hasColumn('posbankum', 'updated_at')) {
            $payload['updated_at'] = now();
        }

        DB::table('posbankum')->insert($payload);

        $newPosbankum = DB::table('posbankum')
            ->where('id_kelurahan', $data['id_kelurahan'])
            ->orderByDesc('created_at')
            ->first();

        if (!$newPosbankum) {
            throw ValidationException::withMessages([
                'id_posbankum' => 'Gagal membuat Posbankum otomatis.',
            ]);
        }

        return (string) $newPosbankum->id_posbankum;
    }

    private function validateWilayahPosbankum(array $data): void
    {
        if (!$this->hasColumn('posbankum', 'id_kelurahan')) {
            return;
        }

        $wilayahValid = DB::table('posbankum as p')
            ->join('kelurahan as kel', 'kel.id_kelurahan', '=', 'p.id_kelurahan')
            ->join('kecamatan as kec', 'kec.id_kecamatan', '=', 'kel.id_kecamatan')
            ->join('kabupaten as kab', 'kab.id_kabupaten', '=', 'kec.id_kabupaten')
            ->where('p.id_posbankum', $data['id_posbankum'])
            ->where('kel.id_kelurahan', $data['id_kelurahan'])
            ->where('kec.id_kecamatan', $data['id_kecamatan'])
            ->where('kab.id_kabupaten', $data['id_kabupaten'])
            ->exists();

        if (!$wilayahValid) {
            throw ValidationException::withMessages([
                'id_posbankum' => 'Posbankum tidak sesuai dengan kabupaten, kecamatan, atau kelurahan yang dipilih.',
            ]);
        }
    }

    private function buildUserPayload(array $data, bool $isCreate = true): array
    {
        $payload = [];

        $this->addColumn($payload, 'users', 'nama_lengkap', $data['nama_lengkap']);
        $this->addColumn($payload, 'users', 'name', $data['nama_lengkap']);
        $this->addColumn($payload, 'users', 'email', $data['email']);
        $this->addColumn($payload, 'users', 'nomor_telepon', $data['nomor_telepon'] ?? null);
        $this->addColumn($payload, 'users', 'role', 'paralegal');
        $this->addColumn($payload, 'users', 'id_posbankum', $data['id_posbankum']);
        $this->addColumn($payload, 'users', 'status', 'aktif');

        if ($isCreate) {
            $randomPassword = Str::random(64);

            $this->addColumn($payload, 'users', 'password_hash', Hash::make($randomPassword));
            $this->addColumn($payload, 'users', 'password', Hash::make($randomPassword));
            $this->addColumn($payload, 'users', 'created_at', now());
        }

        $this->addColumn($payload, 'users', 'updated_at', now());

        return $payload;
    }

    private function createUser(array $data): string
    {
        $userKeyColumn = $this->userKeyColumn();
        $payload = $this->buildUserPayload($data, true);

        if ($this->hasColumn('users', $userKeyColumn) && !$this->isAutoIncrement('users', $userKeyColumn)) {
            $idUser = (string) Str::uuid();
            $payload[$userKeyColumn] = $idUser;

            DB::table('users')->insert($payload);

            return $idUser;
        }

        $idUser = DB::table('users')->insertGetId($payload, $userKeyColumn);

        return (string) $idUser;
    }

    private function updateUser(string $idUser, array $data): void
    {
        $userKeyColumn = $this->userKeyColumn();
        $payload = $this->buildUserPayload($data, false);

        DB::table('users')
            ->where($userKeyColumn, $idUser)
            ->where('role', 'paralegal')
            ->update($payload);
    }

    private function findParalegal(string $idUser): ?object
    {
        $userKeyColumn = $this->userKeyColumn();

        return DB::table('users')
            ->where($userKeyColumn, $idUser)
            ->where('role', 'paralegal')
            ->first();
    }

    private function getAuthUserId(Request $request): ?string
    {
        $user = $request->user();

        if (!$user) {
            return null;
        }

        return $user->id_user ?? $user->id ?? null;
    }

    private function syncPosbankumParalegal(string $idUser, string $idPosbankum, ?string $assignedBy = null): void
    {
        if (!$this->hasTable('posbankum_paralegal')) {
            return;
        }

        $inactivePayload = [];

        $this->addColumn($inactivePayload, 'posbankum_paralegal', 'status', 'nonaktif');

        if (!empty($inactivePayload)) {
            DB::table('posbankum_paralegal')
                ->where('id_user', $idUser)
                ->update($inactivePayload);
        }

        $existing = DB::table('posbankum_paralegal')
            ->where('id_user', $idUser)
            ->where('id_posbankum', $idPosbankum)
            ->first();

        $payload = [];

        $this->addColumn($payload, 'posbankum_paralegal', 'id_posbankum', $idPosbankum);
        $this->addColumn($payload, 'posbankum_paralegal', 'id_user', $idUser);
        $this->addColumn($payload, 'posbankum_paralegal', 'is_primary', 0);
        $this->addColumn($payload, 'posbankum_paralegal', 'status', 'aktif');

        if ($assignedBy !== null && $assignedBy !== '') {
            $this->addColumn($payload, 'posbankum_paralegal', 'assigned_by', $assignedBy);
        } elseif ($this->hasColumn('posbankum_paralegal', 'assigned_by')) {
            $payload['assigned_by'] = null;
        }

        $this->addColumn($payload, 'posbankum_paralegal', 'assigned_at', now());
        $this->addColumn($payload, 'posbankum_paralegal', 'updated_at', now());

        if ($existing) {
            $query = DB::table('posbankum_paralegal');

            if ($this->hasColumn('posbankum_paralegal', 'id_relasi') && isset($existing->id_relasi)) {
                $query->where('id_relasi', $existing->id_relasi);
            } else {
                $query->where('id_user', $idUser)
                    ->where('id_posbankum', $idPosbankum);
            }

            $query->update($payload);

            return;
        }

        if ($this->hasColumn('posbankum_paralegal', 'id_relasi') && !$this->isAutoIncrement('posbankum_paralegal', 'id_relasi')) {
            $payload['id_relasi'] = (string) Str::uuid();
        }

        $this->addColumn($payload, 'posbankum_paralegal', 'created_at', now());

        DB::table('posbankum_paralegal')->insert($payload);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateRequest($request);

        try {
            DB::transaction(function () use ($data, $request) {
                $idUser = $this->createUser($data);

                $this->syncPosbankumParalegal(
                    $idUser,
                    $data['id_posbankum'],
                    $this->getAuthUserId($request),
                );
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'database' => $e->getMessage() ?: 'Gagal menyimpan data paralegal.',
            ]);
        }

        return back()->with('success', 'Data paralegal berhasil disimpan.');
    }

    public function update(Request $request, string $idUser): RedirectResponse
    {
        $data = $this->validateRequest($request, $idUser);

        $user = $this->findParalegal($idUser);

        if (!$user) {
            throw ValidationException::withMessages([
                'id_user' => 'Akun paralegal tidak ditemukan.',
            ]);
        }

        try {
            DB::transaction(function () use ($data, $request, $idUser) {
                $this->updateUser($idUser, $data);

                $this->syncPosbankumParalegal(
                    $idUser,
                    $data['id_posbankum'],
                    $this->getAuthUserId($request),
                );
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'database' => $e->getMessage() ?: 'Gagal memperbarui data paralegal.',
            ]);
        }

        return back()->with('success', 'Data paralegal berhasil diperbarui.');
    }

    public function destroy(string $idUser): RedirectResponse
    {
        $user = $this->findParalegal($idUser);

        if (!$user) {
            throw ValidationException::withMessages([
                'id_user' => 'Akun paralegal tidak ditemukan.',
            ]);
        }

        try {
            DB::transaction(function () use ($idUser) {
                $userKeyColumn = $this->userKeyColumn();

                $userPayload = [];

                $this->addColumn($userPayload, 'users', 'status', 'nonaktif');
                $this->addColumn($userPayload, 'users', 'updated_at', now());

                if (!empty($userPayload)) {
                    DB::table('users')
                        ->where($userKeyColumn, $idUser)
                        ->where('role', 'paralegal')
                        ->update($userPayload);
                }

                if ($this->hasTable('posbankum_paralegal')) {
                    $relasiPayload = [];

                    $this->addColumn($relasiPayload, 'posbankum_paralegal', 'status', 'nonaktif');
                    $this->addColumn($relasiPayload, 'posbankum_paralegal', 'updated_at', now());

                    if (!empty($relasiPayload)) {
                        DB::table('posbankum_paralegal')
                            ->where('id_user', $idUser)
                            ->update($relasiPayload);
                    }
                }
            });
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'database' => $e->getMessage() ?: 'Gagal menghapus akun paralegal.',
            ]);
        }

        return back()->with('success', 'Akun paralegal berhasil dihapus.');
    }
}
