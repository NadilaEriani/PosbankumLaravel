<?php

namespace Tests\Unit;

use App\Services\PendaftaranParalegalService;
use PHPUnit\Framework\TestCase;

class PendaftarParalegalTest extends TestCase
{
    public function test_saring_membuang_yang_sudah_punya_akun_dan_memberi_tanda(): void
    {
        $akun = [
            (object) ['email' => 'Sudah@Gmail.com', 'role' => 'paralegal', 'nomor_telepon' => '6281200000001', 'nama_lengkap' => 'Paralegal Lama'],
            (object) ['email' => 'admin@gmail.com', 'role' => 'admin', 'nomor_telepon' => null, 'nama_lengkap' => 'Admin'],
            (object) ['email' => 'warga@gmail.com', 'role' => 'warga', 'nomor_telepon' => '081299999999', 'nama_lengkap' => 'Warga'],
        ];

        $baris = [
            ['no_registrasi' => 'PR-2026-0001', 'nama' => 'A', 'email' => 'sudah@gmail.com', 'telp' => '0811'],
            ['no_registrasi' => 'PR-2026-0002', 'nama' => 'B', 'email' => 'ADMIN@gmail.com', 'telp' => '0812'],
            ['no_registrasi' => 'PR-2026-0003', 'nama' => 'C', 'email' => ' Warga@gmail.com ', 'telp' => '081299999999'],
            ['no_registrasi' => 'PR-2026-0004', 'nama' => 'D', 'email' => 'baru@gmail.com', 'telp' => '081200000001'],
            ['no_registrasi' => 'PR-2026-0005', 'nama' => 'E', 'email' => 'baru2@gmail.com', 'telp' => '0813-0000-0002', 'kolom_asing' => 'x'],
            ['no_registrasi' => '=HYPERLINK("x")', 'nama' => 'F', 'email' => 'jahat@gmail.com'],
            'bukan array',
        ];

        $hasil = PendaftaranParalegalService::saring($baris, $akun);

        $this->assertSame(
            ['PR-2026-0003', 'PR-2026-0004', 'PR-2026-0005'],
            array_column($hasil, 'no_registrasi'),
        );

        // Email warga: tetap tampil dengan tanda; telepon warga bukan petunjuk akun paralegal.
        $this->assertTrue($hasil[0]['akun_warga']);
        $this->assertSame('warga@gmail.com', $hasil[0]['email']);
        $this->assertNull($hasil[0]['telepon_dipakai']);

        // 0812... di Sheet sama dengan 62812... di akun paralegal.
        $this->assertFalse($hasil[1]['akun_warga']);
        $this->assertSame('Paralegal Lama', $hasil[1]['telepon_dipakai']);

        $this->assertSame('081300000002', $hasil[2]['telp']);
        $this->assertArrayNotHasKey('kolom_asing', $hasil[2]);
    }
}
