<?php

namespace Tests\Feature;

use App\Services\PendaftaranParalegalService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class PendaftaranParalegalServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.pendaftaran_paralegal.url' => 'https://script.test/exec',
            'services.pendaftaran_paralegal.key' => 'kunci-uji',
        ]);
    }

    public function test_tandai_mengirim_status_beserta_kunci(): void
    {
        Http::fake(['script.test/*' => Http::response(['success' => true])]);

        PendaftaranParalegalService::tandai('PR-2026-0001', 'Ditolak');

        Http::assertSent(fn (Request $request) => $request->url() === 'https://script.test/exec'
            && $request['action'] === 'status'
            && $request['no_registrasi'] === 'PR-2026-0001'
            && $request['status'] === 'Ditolak'
            && $request['key'] === 'kunci-uji');
    }

    public function test_jawaban_gagal_dari_form_menjadi_exception_dengan_pesannya(): void
    {
        Http::fake(['script.test/*' => Http::response([
            'success' => false,
            'message' => 'Pendaftar ini sudah diproses (Disetujui).',
        ])]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Pendaftar ini sudah diproses (Disetujui).');

        PendaftaranParalegalService::tandai('PR-2026-0001', 'Ditolak');
    }

    public function test_tanpa_konfigurasi_tidak_ada_permintaan_keluar(): void
    {
        config(['services.pendaftaran_paralegal.key' => null]);
        Http::fake();

        try {
            PendaftaranParalegalService::daftar();
            $this->fail('Seharusnya melempar exception.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('belum dikonfigurasi', $e->getMessage());
        }

        Http::assertNothingSent();
    }
}
