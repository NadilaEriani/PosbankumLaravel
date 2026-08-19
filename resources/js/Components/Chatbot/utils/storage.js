// ── Storage Utility ──────────────────────────────────────────────
// Mengelola sessionId dan chat history di localStorage

const SESSION_KEY = 'posbakum_session';
const HISTORY_KEY = 'posbakum_history';

/** Generate unique session ID */
export function generateSessionId() {
  return 'NARA-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

/** Ambil atau buat session ID baru */
export function getOrCreateSessionId() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const newId = generateSessionId();
    localStorage.setItem(SESSION_KEY, newId);
    return newId;
  } catch (err) {
    console.warn("Session error:", err);
    return generateSessionId();
  }
}

/** Reset session ID (membuat sesi baru) */
export function resetSessionId() {
  const newId = generateSessionId();
  try {
    localStorage.setItem(SESSION_KEY, newId);
    clearChatHistory();
  } catch (err) {
    console.warn("clear storage failed", err);
  }
  return newId;
}

/** Simpan riwayat chat */
export function saveChatHistory(messages) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  } catch (err) {
    console.warn("save history error", err);
  }
}

/** Ambil riwayat chat tersimpan */
export function loadChatHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("load history error", err);
  }
  return [];
}

/** Hapus riwayat chat */
export function clearChatHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.warn("clear history error", err);
  }
}
