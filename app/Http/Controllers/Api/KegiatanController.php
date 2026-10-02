<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class KegiatanController extends Controller
{
    // =========================================================================
    // HELPER — Dynamic column builder (identik dengan Paralegal web controller)
    // =========================================================================

    private function addColumn(array &$payload, string $table, string $column, mixed $value): void
    {
        if (Schema::hasColumn($table, $column)) {
            $payload[$column] = $value;
        }
    }

    private function kegiatanKeyColumn(): string
    {
        return Schema::hasColumn('kegiatan', 'id_kegiatan') ? 'id_kegiatan' : 'id';
    }

    private function resolveUserPosbankumId($user): mixed
    {
        if (!$user) return null;

        // Langsung dari kolom user
        foreach (['id_posbankum', 'posbankum_id'] as $key) {
            if (!empty($user->{$key})) return $user->{$key};
        }

        // Fallback via tabel pivot posbankum_paralegal
        if (Schema::hasTable('posbankum_paralegal')) {
            $userId = $user->id_user ?? $user->id ?? null;
            if ($userId && Schema::hasColumn('posbankum_paralegal', 'id_user')) {
                $query = DB::table('posbankum_paralegal')->where('id_user', $userId);
                if (Schema::hasColumn('posbankum_paralegal', 'status')) {
                    $query->where('status', 'aktif');
                }
                $found = $query->value('id_posbankum');
                if ($found) return $found;
            }
        }

        return null;
    }

    /**
     * Proses anggota_terlibat menjadi string JSON yang bersih.
     */
    private function anggotaPayload(Request $request): string
    {
        $raw = $request->input('anggota_terlibat');

        if (is_array($raw)) {
            $items = $raw;
        } else {
            $decoded = json_decode((string) $raw, true);
            $items = is_array($decoded) ? $decoded : [];
        }

        $items = collect($items)
            ->map(fn($item) => trim((string) $item))
            ->filter()
            ->unique()
            ->values()
            ->all();

        return json_encode($items, JSON_UNESCAPED_UNICODE);
    }

    /**
     * Upload file thumbnail, mendukung key 'thumbnail' maupun 'thumbnail_path'.
     */
    private function storeThumbnail(Request $request, mixed $idPosbankum): ?string
    {
        $fileKey = $request->hasFile('thumbnail') ? 'thumbnail'
            : ($request->hasFile('thumbnail_path') ? 'thumbnail_path' : null);

        if (!$fileKey) return null;

        $file = $request->file($fileKey);
        if (!$file || !$file->isValid()) return null;

        $safeName  = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        // Ekstensi dari isi file, bukan dari nama kiriman klien (cegah .php/.html di disk public)
        $extension = $file->extension() ?: 'jpg';
        $filename  = now()->format('YmdHis') . '-' . Str::random(10) . '-' . ($safeName ?: 'kegiatan') . '.' . $extension;

        $storedPath = $file->storeAs(
            'kegiatan-thumbnails/posbankum/' . preg_replace('/[^A-Za-z0-9_\-]/', '-', (string) ($idPosbankum ?: 'api')),
            $filename,
            'public'
        );

        return $storedPath ? '/storage/' . $storedPath : null;
    }

    /**
     * Hapus file thumbnail dari storage.
     */
    private function deleteThumbnail(?string $path): void
    {
        if (!$path) return;

        $clean = preg_replace('#^/storage/#', '', $path);
        $clean = preg_replace('#^storage/#', '', $clean);
        $clean = preg_replace('#^public/#', '', $clean);
        $clean = trim($clean, '/');

        if ($clean && Storage::disk('public')->exists($clean)) {
            Storage::disk('public')->delete($clean);
        }
    }

    /**
     * Build payload secara dinamis berdasarkan kolom yang ada di tabel kegiatan.
     */
    private function buildPayload(Request $request, ?string $thumbnailPath, bool $isCreate = false): array
    {
        $payload = [];

        $judul          = trim((string) $request->input('judul'));
        $deskripsi      = trim((string) ($request->input('deskripsi') ?? '')) ?: null;
        $lokasi         = trim((string) $request->input('lokasi'));
        $jumlahPeserta  = $request->filled('jumlah_peserta') ? (int) $request->input('jumlah_peserta') : null;
        $hasilKegiatan  = trim((string) ($request->input('hasil_kegiatan') ?? '')) ?: null;
        $anggota        = $this->anggotaPayload($request);

        // Judul
        $this->addColumn($payload, 'kegiatan', 'judul', $judul);
        $this->addColumn($payload, 'kegiatan', 'nama_kegiatan', $judul);

        // Deskripsi (banyak variasi nama kolom)
        if (Schema::hasColumn('kegiatan', 'deskripsi')) {
            $payload['deskripsi'] = $deskripsi;
        } elseif (Schema::hasColumn('kegiatan', 'keterangan')) {
            $payload['keterangan'] = $deskripsi;
        } elseif (Schema::hasColumn('kegiatan', 'catatan')) {
            $payload['catatan'] = $deskripsi;
        }

        // Tanggal
        $this->addColumn($payload, 'kegiatan', 'tgl_mulai', $request->input('tgl_mulai'));
        $this->addColumn($payload, 'kegiatan', 'tanggal_kegiatan', $request->input('tgl_mulai'));
        $this->addColumn($payload, 'kegiatan', 'tanggal', $request->input('tgl_mulai'));
        $this->addColumn($payload, 'kegiatan', 'tgl_selesai', $request->input('tgl_selesai') ?: null);

        // Lokasi
        $this->addColumn($payload, 'kegiatan', 'lokasi', $lokasi);
        $this->addColumn($payload, 'kegiatan', 'tempat', $lokasi);
        $this->addColumn($payload, 'kegiatan', 'alamat', $lokasi);

        // Jumlah peserta
        $this->addColumn($payload, 'kegiatan', 'jumlah_peserta', $jumlahPeserta);
        $this->addColumn($payload, 'kegiatan', 'target_peserta', $jumlahPeserta);

        // Hasil kegiatan
        $this->addColumn($payload, 'kegiatan', 'hasil_kegiatan', $hasilKegiatan);

        // Anggota terlibat
        $this->addColumn($payload, 'kegiatan', 'anggota_terlibat', $anggota);
        $this->addColumn($payload, 'kegiatan', 'anggota', $anggota);
        $this->addColumn($payload, 'kegiatan', 'peserta_terlibat', $anggota);
        $this->addColumn($payload, 'kegiatan', 'tim_terlibat', $anggota);

        // Thumbnail
        $this->addColumn($payload, 'kegiatan', 'thumbnail_path', $thumbnailPath);
        $this->addColumn($payload, 'kegiatan', 'gambar', $thumbnailPath);
        $this->addColumn($payload, 'kegiatan', 'image', $thumbnailPath);

        if ($isCreate) {
            $idPosbankum = $this->resolveUserPosbankumId($request->user());
            $userId      = $request->user()?->id_user ?? $request->user()?->id ?? null;

            $keyColumn = $this->kegiatanKeyColumn();
            $payload[$keyColumn] = Str::uuid()->toString();

            $this->addColumn($payload, 'kegiatan', 'id_posbankum', $idPosbankum);
            $this->addColumn($payload, 'kegiatan', 'id_user', $userId);
            $this->addColumn($payload, 'kegiatan', 'created_by', $userId);
            $this->addColumn($payload, 'kegiatan', 'status', 'menunggu');
            $this->addColumn($payload, 'kegiatan', 'tgl_upload', now());
            $this->addColumn($payload, 'kegiatan', 'created_at', now());
        }

        $this->addColumn($payload, 'kegiatan', 'updated_at', now());

        return $payload;
    }

    // Edit dari mobile mengirim thumbnail_path berisi URL lama (teks) bila foto tidak diganti,
    // jadi aturan gambar hanya berlaku saat yang dikirim berupa file.
    private function aturanThumbnail(Request $request, string $key): string
    {
        return $request->hasFile($key) ? 'image|mimes:jpg,jpeg,png,webp|max:5120' : 'nullable';
    }

    // Kegiatan hanya urusan paralegal; null = boleh, selain itu response penolakan
    private function tolakSelainParalegal(Request $request)
    {
        if ($request->user()?->role !== 'paralegal') {
            return response()->json(['status' => false, 'message' => 'Hanya paralegal yang bisa mengakses kegiatan'], 403);
        }
        return null;
    }

    // Kegiatan hanya boleh dibuka/diubah paralegal dari posbankum pemiliknya
    private function bukanPosbankumSaya(Request $request, object $row): bool
    {
        $milik = $row->id_posbankum ?? null;
        return $milik !== null && (string) $milik !== (string) $this->resolveUserPosbankumId($request->user());
    }

    // =========================================================================
    // API ENDPOINTS
    // =========================================================================

    /**
     * GET /api/kegiatan
     * Daftar semua kegiatan (diurutkan dari terbaru).
     */
    public function index(Request $request)
    {
        if ($tolak = $this->tolakSelainParalegal($request)) {
            return $tolak;
        }

        $query = DB::table('kegiatan');

        // Hanya kegiatan milik posbankum paralegal yang login; tanpa posbankum = daftar kosong
        $idPosbankum = $this->resolveUserPosbankumId($request->user());
        if (Schema::hasColumn('kegiatan', 'id_posbankum')) {
            $idPosbankum
                ? $query->where('id_posbankum', $idPosbankum)
                : $query->whereRaw('1 = 0');
        }

        // Tentukan kolom sort yang tersedia
        $orderColumn = Schema::hasColumn('kegiatan', 'tgl_upload') ? 'tgl_upload'
            : (Schema::hasColumn('kegiatan', 'created_at') ? 'created_at' : $this->kegiatanKeyColumn());

        $data = $query->orderBy($orderColumn, 'desc')->get();

        return response()->json([
            'status'  => true,
            'message' => 'Berhasil',
            'data'    => $data,
        ]);
    }

    /**
     * GET /api/kegiatan/{id}
     * Detail kegiatan berdasarkan UUID.
     */
    public function show(Request $request, string $id)
    {
        if ($tolak = $this->tolakSelainParalegal($request)) {
            return $tolak;
        }

        $keyColumn = $this->kegiatanKeyColumn();
        $data = DB::table('kegiatan')->where($keyColumn, $id)->first();

        if (!$data || $this->bukanPosbankumSaya($request, $data)) {
            return response()->json([
                'status'  => false,
                'message' => 'Kegiatan tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => true,
            'message' => 'Berhasil',
            'data'    => $data,
        ]);
    }

    /**
     * POST /api/kegiatan
     * Buat kegiatan baru (hanya paralegal).
     */
    public function store(Request $request)
    {
        if ($tolak = $this->tolakSelainParalegal($request)) {
            return $tolak;
        }

        $request->validate([
            'judul'            => 'required|string|max:255',
            'deskripsi'        => 'nullable|string',
            'tgl_mulai'        => 'required|date',
            'lokasi'           => 'required|string|max:255',
            'jumlah_peserta'   => 'nullable|integer|min:0',
            'anggota_terlibat' => 'nullable',
            'thumbnail'        => $this->aturanThumbnail($request, 'thumbnail'),
            'thumbnail_path'   => $this->aturanThumbnail($request, 'thumbnail_path'),
        ]);

        $idPosbankum   = $this->resolveUserPosbankumId($request->user());
        $thumbnailPath = $this->storeThumbnail($request, $idPosbankum ?: 'api');
        $payload       = $this->buildPayload($request, $thumbnailPath, true);

        if (empty($payload)) {
            return response()->json([
                'status'  => false,
                'message' => 'Tidak ada kolom kegiatan yang bisa disimpan.',
            ], 422);
        }

        DB::table('kegiatan')->insert($payload);

        return response()->json([
            'status'  => true,
            'message' => 'Kegiatan berhasil ditambahkan',
            'data'    => null,
        ], 201);
    }

    /**
     * PUT /api/kegiatan/{id}
     * Update kegiatan (hanya paralegal pemilik).
     */
    public function update(Request $request, string $id)
    {
        if ($tolak = $this->tolakSelainParalegal($request)) {
            return $tolak;
        }

        $request->validate([
            'judul'            => 'required|string|max:255',
            'deskripsi'        => 'nullable|string',
            'tgl_mulai'        => 'required|date',
            'lokasi'           => 'required|string|max:255',
            'jumlah_peserta'   => 'nullable|integer|min:0',
            'anggota_terlibat' => 'nullable',
            'thumbnail'        => $this->aturanThumbnail($request, 'thumbnail'),
            'thumbnail_path'   => $this->aturanThumbnail($request, 'thumbnail_path'),
        ]);

        $keyColumn = $this->kegiatanKeyColumn();
        $row       = DB::table('kegiatan')->where($keyColumn, $id)->first();

        if (!$row || $this->bukanPosbankumSaya($request, $row)) {
            return response()->json([
                'status'  => false,
                'message' => 'Kegiatan tidak ditemukan',
            ], 404);
        }

        // Resolve thumbnail lama
        $oldThumbnail  = $row->thumbnail_path ?? $row->gambar ?? $row->image ?? null;
        $thumbnailPath = $oldThumbnail;

        $idPosbankum = $this->resolveUserPosbankumId($request->user());

        // Handle upload file baru
        $fileKey = $request->hasFile('thumbnail') ? 'thumbnail'
            : ($request->hasFile('thumbnail_path') ? 'thumbnail_path' : null);

        if ($fileKey) {
            $thumbnailPath = $this->storeThumbnail($request, $idPosbankum ?: 'api');
            // Hapus file lama jika berbeda
            if ($oldThumbnail && $oldThumbnail !== $thumbnailPath) {
                $this->deleteThumbnail($oldThumbnail);
            }
        }

        $payload = $this->buildPayload($request, $thumbnailPath, false);

        // Selalu reset status ke menunggu saat edit
        $this->addColumn($payload, 'kegiatan', 'status', 'menunggu');

        if (empty($payload)) {
            return response()->json([
                'status'  => false,
                'message' => 'Tidak ada kolom kegiatan yang bisa diperbarui.',
            ], 422);
        }

        DB::table('kegiatan')->where($keyColumn, $id)->update($payload);

        return response()->json([
            'status'  => true,
            'message' => 'Kegiatan berhasil diperbarui',
            'data'    => null,
        ]);
    }
}
