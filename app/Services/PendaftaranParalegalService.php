<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Pendaftar paralegal dari form Apps Script (Google Sheet "Data paralegal riau").
 * Sheet tetap menjadi sumber data: web hanya membaca baris yang belum diproses
 * dan menulis kolom status lewat web app Apps Script.
 */
class PendaftaranParalegalService
{
    public const POLA_NO_REGISTRASI = '/^PR-\d{4}-\d{4,}$/';

    /**
     * Baris Sheet yang kolom statusnya masih kosong.
     */
    public static function daftar(): array
    {
        $data = self::panggil(['action' => 'pendaftar'])['data'] ?? [];

        return is_array($data) ? $data : [];
    }

    /**
     * Tulis status ("Disetujui" atau "Ditolak") ke baris Sheet.
     */
    public static function tandai(string $noRegistrasi, string $status): void
    {
        self::panggil([
            'action' => 'status',
            'no_registrasi' => $noRegistrasi,
            'status' => $status,
        ]);
    }

    /**
     * Buang pendaftar yang emailnya sudah menjadi akun paralegal/admin, lalu
     * tandai yang emailnya sudah dipakai akun warga atau nomor HP-nya sama
     * dengan akun paralegal lain. Data Sheet diisi publik: hanya field yang
     * dikenal yang diteruskan.
     */
    public static function saring(array $baris, iterable $akun): array
    {
        $roleEmail = [];
        $pemilikTelepon = [];

        foreach ($akun as $item) {
            $item = (array) $item;
            $email = self::email($item['email'] ?? '');
            $role = (string) ($item['role'] ?? '');

            if ($email !== '' && ($role !== 'warga' || !isset($roleEmail[$email]))) {
                $roleEmail[$email] = $role;
            }

            $telepon = self::telepon($item['nomor_telepon'] ?? '');

            if ($role === 'paralegal' && $telepon !== '') {
                $pemilikTelepon[$telepon] = self::teks($item['nama_lengkap'] ?? '');
            }
        }

        $hasil = [];

        foreach ($baris as $item) {
            if (!is_array($item)) {
                continue;
            }

            $noRegistrasi = self::teks($item['no_registrasi'] ?? '');

            if (!preg_match(self::POLA_NO_REGISTRASI, $noRegistrasi)) {
                continue;
            }

            $email = self::email($item['email'] ?? '');
            $role = $roleEmail[$email] ?? null;

            if ($role !== null && $role !== 'warga') {
                continue;
            }

            $telepon = self::telepon($item['telp'] ?? '');

            $hasil[] = [
                'no_registrasi' => $noRegistrasi,
                'waktu' => self::teks($item['waktu'] ?? ''),
                'nama' => self::teks($item['nama'] ?? ''),
                'email' => $email,
                'telp' => $telepon,
                'kabupaten' => self::teks($item['kabupaten'] ?? ''),
                'kecamatan' => self::teks($item['kecamatan'] ?? ''),
                'kelurahan' => self::teks($item['kelurahan'] ?? ''),
                'akun_warga' => $role === 'warga',
                'telepon_dipakai' => $pemilikTelepon[$telepon] ?? null,
            ];
        }

        return $hasil;
    }

    private static function panggil(array $payload): array
    {
        $url = (string) config('services.pendaftaran_paralegal.url');
        $key = (string) config('services.pendaftaran_paralegal.key');

        if ($url === '' || $key === '') {
            throw new RuntimeException('Integrasi form pendaftaran belum dikonfigurasi di server.');
        }

        try {
            $json = Http::timeout(20)->post($url, $payload + ['key' => $key])->json();
        } catch (\Throwable $e) {
            report($e);

            throw new RuntimeException('Tidak dapat menghubungi form pendaftaran. Coba lagi beberapa saat.');
        }

        if (!is_array($json) || empty($json['success'])) {
            throw new RuntimeException(
                self::teks($json['message'] ?? '') ?: 'Form pendaftaran menolak permintaan.'
            );
        }

        return $json;
    }

    private static function teks(mixed $nilai): string
    {
        return is_scalar($nilai) ? mb_substr(trim((string) $nilai), 0, 255) : '';
    }

    private static function email(mixed $nilai): string
    {
        return mb_strtolower(self::teks($nilai));
    }

    /**
     * Hanya angka, awalan 62 disamakan menjadi 0.
     */
    private static function telepon(mixed $nilai): string
    {
        $angka = preg_replace('/\D/', '', self::teks($nilai));

        return str_starts_with($angka, '62') ? '0' . substr($angka, 2) : $angka;
    }
}
