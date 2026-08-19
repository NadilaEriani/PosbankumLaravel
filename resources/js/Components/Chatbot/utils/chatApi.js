// ── Chat API Utility ─────────────────────────────────────────────
// Mengelola komunikasi dengan webhook n8n

//  URL webhook n8n Anda
const N8N_CHATBOT_WEBHOOK_URL = "https://deeplearning.pcr.ac.id/webhook/chatbot";

// Mock response untuk testing saat webhook belum tersedia
const MOCK_RESPONSES = [
  `**Posbakum (Pos Bantuan Hukum)** adalah layanan bantuan hukum **gratis** untuk masyarakat tidak mampu.

**Cara Mengakses:**
1. Kunjungi kantor Kemenkumham terdekat
2. Hubungi Divisi Pelayanan Hukum
3. Daftar secara online via website resmi

> Layanan ini dijamin oleh **UU No. 16 Tahun 2011** tentang Bantuan Hukum.`,
  `Untuk mendapatkan bantuan hukum gratis, siapkan dokumen berikut:

**Dokumen Wajib:**
1. **KTP** atau identitas resmi
2. **Kartu Keluarga (KK)**
3. Surat keterangan tidak mampu (SKTM) dari kelurahan

**Proses:**
\`\`\`
1. Daftar → 2. Verifikasi → 3. Konsultasi → 4. Pendampingan
\`\`\``,
  `**Jam Operasional Posbakum:**
Senin–Jumat: **08.00–16.00 WIB**
Sabtu: **08.00–12.00 WIB** (tergantung kantor)

**Kontak Darurat:**
- Kemenkumham Riau: (0761) 123456
- Hotline Hukum: 1800-xxx-xxx

*Catatan: Libur hari besar nasional*`,
  `**Jenis Bantuan Hukum Posbakum:**

| Jenis | Deskripsi | Contoh Kasus |
|-------|-----------|--------------|
| **Konsultasi** | Nasihat hukum gratis | Pertanyaan umum |
| **Pendampingan** | Pengawalan di pengadilan | Persidangan |
| **Dokumen** | Bikin surat kuasa, dll | Perdata/pidana |

Semua **gratis** untuk yang berhak!`,
  `**Kontak Posbakum Kemenkumham Riau:**

**Kantor Utama:**
\`\`\`
Divisi Pelayanan Hukum & HAM
Kanwil Kemenkumham Riau
Jl. Kemenkumham No. 1, Pekanbaru
Telp: (0761) 456789 | Email: info@posbakum.riau.go.id
\`\`\`

**Website:** kemenkumham.go.id/riau
**Follow IG:** @posbakum_riau

~~Hubungi segera untuk bantuan hukum Anda~~`
];

let mockIndex = 0;
function getMockResponse() {
  const resp = MOCK_RESPONSES[mockIndex % MOCK_RESPONSES.length];
  mockIndex++;
  return resp;
}

/**
 * Kirim pesan ke webhook n8n
 * @param {string} message - Pesan dari user
 * @param {string} sessionId - ID sesi unik
 * @returns {Promise<string>} - Respons dari chatbot
 */
export async function sendMessageToWebhook(message, sessionId) {
  // Jika URL belum dikonfigurasi, gunakan mock response
  if (
    N8N_CHATBOT_WEBHOOK_URL === "GANTI_DENGAN_URL_WEBHOOK_N8N" ||
    !N8N_CHATBOT_WEBHOOK_URL
  ) {
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
    return getMockResponse();
  }

  const body = {
    message: message,
    sessionId: sessionId,
    source: "website",
  };

  const response = await fetch(N8N_CHATBOT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  // Parse response secara fleksibel
  try {
    const data = JSON.parse(raw);
    const d = Array.isArray(data) ? data[0] : data;
    let result = d?.response ||
      d?.output ||
      d?.answer ||
      d?.message ||
      d?.text ||
      raw.trim();
      
    // Sanitize: remove "undefined" artifacts and extra whitespace
    result = result.replace(/undefined/gi, '').trim();
    return result;

  } catch {
    return raw.trim();
  }
}
