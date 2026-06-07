<?php

use App\Http\Controllers\Admin\KelolaBeritaController;
use App\Http\Controllers\Admin\ManajemenAkunController;
use App\Http\Controllers\Admin\VerifikasiDataPosbankumController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('LandingPage');
})->name('home');

/* Google Login */
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])
    ->name('google.redirect');

Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])
    ->name('google.callback');

Route::get('/dashboard', function () {
    $user = Auth::user();
    $role = $user ? strtolower(trim((string) $user->role)) : null;

    if ($role === 'admin') {
        return redirect()->route('admin.dashboard');
    }

    if ($role === 'paralegal' || $role === 'posbankum') {
        return redirect()->route('paralegal.dashboard');
    }

    return redirect()->route('home');
})->middleware(['auth'])->name('dashboard');

Route::middleware(['auth'])->group(function () {
    /* Admin Dashboard */
    Route::get('/admin', [DashboardController::class, 'admin'])
        ->name('admin.dashboard');

    /* Admin Menu */
    Route::get('/admin/kelola-berita/{mode?}/{id?}', [DashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.kelola-berita.page');

    Route::post('/admin/kelola-berita', [KelolaBeritaController::class, 'store'])
        ->name('admin.kelola-berita.store');

    Route::put('/admin/kelola-berita/{id}', [KelolaBeritaController::class, 'update'])
        ->name('admin.kelola-berita.update');

    Route::delete('/admin/kelola-berita/{id}', [KelolaBeritaController::class, 'destroy'])
        ->name('admin.kelola-berita.destroy');

    Route::get('/admin/data-posbankum/{mode?}/{id?}', [DashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.data-posbankum.page');

    Route::get('/admin/verifikasi-data-posbankum/{mode?}/{id?}', [DashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.verifikasi-data-posbankum.page');

    Route::get('/admin/laporan-kegiatan/{mode?}/{id?}', [DashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.laporan-kegiatan.page');

    Route::get('/admin/manajemen-akun/{mode?}/{id?}', [DashboardController::class, 'admin'])
        ->where('mode', 'tambah|edit|detail')
        ->where('id', '[^/]+')
        ->name('admin.manajemen-akun.page');

    /* Manajemen Akun */
    Route::post('/admin/manajemen-akun/paralegal', [ManajemenAkunController::class, 'store'])
        ->name('admin.manajemen-akun.paralegal.store');

    Route::put('/admin/manajemen-akun/paralegal/{idUser}', [ManajemenAkunController::class, 'update'])
        ->name('admin.manajemen-akun.paralegal.update');

    Route::delete('/admin/manajemen-akun/paralegal/{idUser}', [ManajemenAkunController::class, 'destroy'])
        ->name('admin.manajemen-akun.paralegal.destroy');

    /* Verifikasi Data Posbankum */
    Route::patch('/admin/verifikasi-data-posbankum/dokumen/{id}/status', [VerifikasiDataPosbankumController::class, 'updateDokumenStatus'])
        ->name('admin.verifikasi-data-posbankum.dokumen.status');

    Route::patch('/admin/verifikasi-data-posbankum/tagging/{idPosbankum}/status', [VerifikasiDataPosbankumController::class, 'updateTaggingStatus'])
        ->name('admin.verifikasi-data-posbankum.tagging.status');

    Route::patch('/admin/verifikasi-data-posbankum/tagging/{idPosbankum}/location', [VerifikasiDataPosbankumController::class, 'updateTaggingLocation'])
        ->name('admin.verifikasi-data-posbankum.tagging.location');

    /*
    |--------------------------------------------------------------------------
    | Dashboard Paralegal
    |--------------------------------------------------------------------------
    | Dibuat langsung di route agar tidak error:
    | Call to undefined method DashboardController::paralegal()
    */
    Route::get('/paralegal', function (Request $request) {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('home');
        }

        $getValue = function ($row, array $keys, $default = null) {
            foreach ($keys as $key) {
                if (is_object($row) && isset($row->{$key}) && $row->{$key} !== null && $row->{$key} !== '') {
                    return $row->{$key};
                }

                if (is_array($row) && isset($row[$key]) && $row[$key] !== null && $row[$key] !== '') {
                    return $row[$key];
                }
            }

            return $default;
        };

        $hasTable = function (string $table): bool {
            return Schema::hasTable($table);
        };

        $hasColumn = function (string $table, string $column): bool {
            return Schema::hasTable($table) && Schema::hasColumn($table, $column);
        };

        $idPosbankum = $user->id_posbankum
            ?? $user->posbankum_id
            ?? $user->id_posbankum_fk
            ?? null;

        if (!$idPosbankum && $hasTable('paralegal_members')) {
            $paralegalQuery = DB::table('paralegal_members');

            if ($hasColumn('paralegal_members', 'id_user') && isset($user->id_user)) {
                $paralegalQuery->where('id_user', $user->id_user);
            } elseif ($hasColumn('paralegal_members', 'user_id') && isset($user->id)) {
                $paralegalQuery->where('user_id', $user->id);
            } elseif ($hasColumn('paralegal_members', 'email') && isset($user->email)) {
                $paralegalQuery->where('email', $user->email);
            } elseif ($hasColumn('paralegal_members', 'email_paralegal') && isset($user->email)) {
                $paralegalQuery->where('email_paralegal', $user->email);
            } else {
                $paralegalQuery = null;
            }

            if ($paralegalQuery) {
                $paralegalRow = $paralegalQuery->first();
                $idPosbankum = $paralegalRow->id_posbankum
                    ?? $paralegalRow->posbankum_id
                    ?? null;
            }
        }

        $posbankum = null;

        if ($idPosbankum && $hasTable('posbankum')) {
            $posbankumKey = $hasColumn('posbankum', 'id_posbankum')
                ? 'id_posbankum'
                : ($hasColumn('posbankum', 'id') ? 'id' : null);

            if ($posbankumKey) {
                $posbankum = DB::table('posbankum')
                    ->where($posbankumKey, $idPosbankum)
                    ->first();
            }
        }

        $stats = [
            'casesThisMonth' => 0,
            'completedActivities' => 0,
            'activeParalegal' => 0,
        ];

        if ($idPosbankum && $hasTable('pengaduan')) {
            $pengaduanQuery = DB::table('pengaduan');

            if ($hasColumn('pengaduan', 'id_posbankum')) {
                $pengaduanQuery->where('id_posbankum', $idPosbankum);
            }

            if ($hasColumn('pengaduan', 'created_at')) {
                $pengaduanQuery
                    ->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year);
            }

            $stats['casesThisMonth'] = $pengaduanQuery->count();
        }

        if ($idPosbankum && $hasTable('kegiatan')) {
            $kegiatanQuery = DB::table('kegiatan');

            if ($hasColumn('kegiatan', 'id_posbankum')) {
                $kegiatanQuery->where('id_posbankum', $idPosbankum);
            }

            if ($hasColumn('kegiatan', 'status')) {
                $kegiatanQuery->where(function ($query) {
                    $query->where('status', 'selesai')
                        ->orWhere('status', 'Selesai')
                        ->orWhere('status', 'done')
                        ->orWhere('status', 'completed');
                });
            }

            $stats['completedActivities'] = $kegiatanQuery->count();
        }

        if ($idPosbankum && $hasTable('paralegal_members')) {
            $paralegalCountQuery = DB::table('paralegal_members');

            if ($hasColumn('paralegal_members', 'id_posbankum')) {
                $paralegalCountQuery->where('id_posbankum', $idPosbankum);
            }

            $stats['activeParalegal'] = $paralegalCountQuery->count();
        }

        $kasusTerbaru = collect();

        if ($idPosbankum && $hasTable('pengaduan')) {
            $kasusQuery = DB::table('pengaduan');

            if ($hasColumn('pengaduan', 'id_posbankum')) {
                $kasusQuery->where('id_posbankum', $idPosbankum);
            }

            if ($hasColumn('pengaduan', 'created_at')) {
                $kasusQuery->orderByDesc('created_at');
            } elseif ($hasColumn('pengaduan', 'tgl_lapor')) {
                $kasusQuery->orderByDesc('tgl_lapor');
            }

            $kasusTerbaru = $kasusQuery
                ->limit(4)
                ->get()
                ->map(function ($item) use ($getValue) {
                    return [
                        'id' => $getValue($item, ['id_pengaduan', 'id']),
                        'title' => $getValue($item, [
                            'judul',
                            'judul_pengaduan',
                            'judul_laporan',
                            'kategori_masalah',
                            'kategori',
                        ], 'Pengaduan Baru'),
                        'description' => $getValue($item, [
                            'deskripsi',
                            'isi_pengaduan',
                            'isi_laporan',
                            'catatan_admin',
                            'keterangan',
                        ], 'Belum ada deskripsi.'),
                        'location' => $getValue($item, [
                            'lokasi',
                            'alamat',
                            'alamat_kejadian',
                            'tempat_kejadian',
                        ], 'Posbankum'),
                        'date' => $getValue($item, [
                            'created_at',
                            'tgl_lapor',
                            'tanggal',
                            'tgl_kejadian',
                        ]),
                        'status' => $getValue($item, ['status'], 'Diproses'),
                    ];
                })
                ->values();
        }

        $kegiatanTerbaru = collect();

        if ($idPosbankum && $hasTable('kegiatan')) {
            $kegiatanQuery = DB::table('kegiatan');

            if ($hasColumn('kegiatan', 'id_posbankum')) {
                $kegiatanQuery->where('id_posbankum', $idPosbankum);
            }

            if ($hasColumn('kegiatan', 'created_at')) {
                $kegiatanQuery->orderByDesc('created_at');
            } elseif ($hasColumn('kegiatan', 'tgl_upload')) {
                $kegiatanQuery->orderByDesc('tgl_upload');
            } elseif ($hasColumn('kegiatan', 'tgl_mulai')) {
                $kegiatanQuery->orderByDesc('tgl_mulai');
            }

            $kegiatanTerbaru = $kegiatanQuery
                ->limit(4)
                ->get()
                ->map(function ($item) use ($getValue) {
                    return [
                        'id' => $getValue($item, ['id_kegiatan', 'id']),
                        'title' => $getValue($item, ['judul', 'nama_kegiatan'], 'Kegiatan Posbankum'),
                        'description' => $getValue($item, ['deskripsi', 'keterangan'], 'Belum ada deskripsi.'),
                        'date' => $getValue($item, ['tgl_mulai', 'tgl_upload', 'created_at', 'tanggal']),
                        'status' => $getValue($item, ['status'], 'Diproses'),
                    ];
                })
                ->values();
        }

        $notifications = collect();

        if ($hasTable('notifications')) {
            $notifQuery = DB::table('notifications');

            if ($hasColumn('notifications', 'notifiable_id')) {
                $notifQuery->where('notifiable_id', $user->id);
            }

            if ($hasColumn('notifications', 'created_at')) {
                $notifQuery->orderByDesc('created_at');
            }

            $notifications = $notifQuery
                ->limit(20)
                ->get()
                ->map(function ($item) use ($getValue) {
                    $data = [];

                    if (isset($item->data)) {
                        $decoded = json_decode($item->data, true);
                        $data = is_array($decoded) ? $decoded : [];
                    }

                    return [
                        'id' => $getValue($item, ['id']),
                        'title' => $data['title'] ?? $getValue($item, ['title'], 'Notifikasi'),
                        'message' => $data['message'] ?? $getValue($item, ['message'], 'Ada notifikasi baru.'),
                        'kategori' => $data['kategori'] ?? $getValue($item, ['kategori', 'type'], 'pengaduan'),
                        'is_read' => !empty($item->read_at),
                        'created_at' => $getValue($item, ['created_at']),
                    ];
                })
                ->values();
        }

        return Inertia::render('Paralegal/Dashboard', [
            'auth' => [
                'user' => $user,
            ],
            'posbankum' => $posbankum,
            'stats' => $stats,
            'kasusTerbaru' => $kasusTerbaru,
            'kegiatanTerbaru' => $kegiatanTerbaru,
            'notifications' => $notifications,
        ]);
    })->name('paralegal.dashboard');

    Route::get('/posbankum', function () {
        return redirect()->route('paralegal.dashboard');
    })->name('posbankum.dashboard');

    /* Profile Admin */
    Route::get('/admin/profile', [DashboardController::class, 'admin'])
        ->name('admin.profile.page');

    Route::post('/admin/profile', function (Request $request) {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        $userKeyColumn = Schema::hasColumn('users', 'id_user') ? 'id_user' : 'id';
        $userKey = $user->{$userKeyColumn}
            ?? $user->id_user
            ?? $user->id
            ?? $user->getKey();

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

        $addColumn = function (string $column, mixed $value) use (&$payload) {
            if (Schema::hasTable('users') && Schema::hasColumn('users', $column)) {
                $payload[$column] = $value;
            }
        };

        $blankToNull = function (mixed $value): ?string {
            $clean = trim((string) ($value ?? ''));

            return $clean === '' ? null : $clean;
        };

        $fullName = trim($data['full_name']);
        $email = strtolower(trim($data['email_kantor']));

        $addColumn('nama_lengkap', $fullName);
        $addColumn('name', $fullName);
        $addColumn('email', $email);
        $addColumn('email_kantor', $email);
        $addColumn('nip', $blankToNull($data['nip'] ?? null));
        $addColumn('nomor_telepon', $blankToNull($data['nomor_telepon'] ?? null));
        $addColumn('nomor_kantor', $blankToNull($data['nomor_kantor'] ?? null));
        $addColumn('jabatan', $blankToNull($data['jabatan'] ?? null));
        $addColumn('unit_kerja', $blankToNull($data['unit_kerja'] ?? null));
        $addColumn('alamat_kantor', $blankToNull($data['alamat_kantor'] ?? null));

        $oldPhoto = (string) ($user->foto_profile ?? '');
        $nextPhoto = $oldPhoto;
        $removePhoto = $request->boolean('remove_photo');

        if ($request->hasFile('foto_profile') && Schema::hasColumn('users', 'foto_profile')) {
            $file = $request->file('foto_profile');
            $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $filename = Str::uuid()->toString() . '.' . $extension;
            $folder = 'profile-photos/admin/' . preg_replace('/[^A-Za-z0-9_\-]/', '-', (string) $userKey);

            $nextPhoto = $file->storeAs($folder, $filename, 'public');
            $addColumn('foto_profile', $nextPhoto);
        } elseif ($removePhoto && Schema::hasColumn('users', 'foto_profile')) {
            $nextPhoto = '';
            $addColumn('foto_profile', null);
        }

        $addColumn('updated_at', now());

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'database' => 'Tidak ada kolom profil yang bisa diperbarui pada tabel users.',
            ]);
        }

        DB::table('users')
            ->where($userKeyColumn, $userKey)
            ->update($payload);

        if (($request->hasFile('foto_profile') || $removePhoto) && $oldPhoto && $oldPhoto !== $nextPhoto) {
            $cleanPath = trim($oldPhoto);

            if (
                $cleanPath !== '' &&
                !preg_match('/^https?:\/\//i', $cleanPath) &&
                !preg_match('/^(data:|blob:)/i', $cleanPath)
            ) {
                $cleanPath = str_replace('\\', '/', $cleanPath);
                $cleanPath = preg_replace('#^/storage/#', '', $cleanPath);
                $cleanPath = preg_replace('#^storage/#', '', $cleanPath);
                $cleanPath = preg_replace('#^public/#', '', $cleanPath);

                if ($cleanPath && Storage::disk('public')->exists($cleanPath)) {
                    Storage::disk('public')->delete($cleanPath);
                }
            }
        }

        return redirect()
            ->back()
            ->with('success', 'Profil admin berhasil diperbarui.');
    })->name('admin.profile.update');

    Route::post('/admin/profile/password', function (Request $request) {
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

        if (Schema::hasColumn('users', 'password_hash')) {
            $payload['password_hash'] = Hash::make($data['password']);
        }

        if (Schema::hasColumn('users', 'password')) {
            $payload['password'] = Hash::make($data['password']);
        }

        if (Schema::hasColumn('users', 'updated_at')) {
            $payload['updated_at'] = now();
        }

        if (empty($payload)) {
            throw ValidationException::withMessages([
                'password' => 'Kolom password belum tersedia pada tabel users.',
            ]);
        }

        $userKeyColumn = Schema::hasColumn('users', 'id_user') ? 'id_user' : 'id';
        $userKey = $user->{$userKeyColumn}
            ?? $user->id_user
            ?? $user->id
            ?? $user->getKey();

        DB::table('users')
            ->where($userKeyColumn, $userKey)
            ->update($payload);

        return redirect()
            ->back()
            ->with('success', 'Password berhasil diperbarui.');
    })->name('admin.profile.password');

    /* Profile */
    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');

    Route::patch('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');

    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->name('profile.destroy');
});

require __DIR__ . '/auth.php';