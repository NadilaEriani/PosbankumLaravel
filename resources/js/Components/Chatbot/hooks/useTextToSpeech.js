// ── useTextToSpeech Hook ─────────────────────────────────────────
import { useState, useRef, useCallback, useEffect } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported] = useState(() => 'speechSynthesis' in window);
  const utteranceRef = useRef(null);
  const lastTextRef = useRef('');

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  /** Pilih suara berbahasa Indonesia dengan suara wanita */
  const getBestVoice = useCallback(() => {
    if (!isSupported) return null;
    const voices = window.speechSynthesis.getVoices();

    // Ambil semua opsi suara bahasa Indonesia
    const idVoices = voices.filter(
      (v) => v.lang.startsWith('id') || v.lang.toLowerCase().startsWith('in-id')
    );

    let chosenVoice = null;

    if (idVoices.length > 0) {
      // Prioritaskan suara yang biasanya wanita (Gadis, Damayanti, Google, atau ada kata 'female')
      chosenVoice = idVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('female') || name.includes('gadis') || name.includes('damayanti') || name.includes('google');
      });

      // Jika tidak ada spesifik, ambil suara Indonesia default pertama
      if (!chosenVoice) {
        chosenVoice = idVoices[0];
      }
    } else {
      // Fallback mutlak: suara wanita acak atau default sistem
      chosenVoice = voices.find((v) => v.name.toLowerCase().includes('female')) || voices[0] || null;
    }

    return chosenVoice;
  }, [isSupported]);

  const speak = useCallback(
    (text, { onEnd } = {}) => {
      if (!isSupported || isMuted || !text) return;

      // Hentikan suara sebelumnya
      window.speechSynthesis.cancel();

      lastTextRef.current = text;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;  // Normal speed (wanita kadang terdengar aneh jika diperlambat)
      utterance.pitch = 1.1; // Sedikit dinaikkan untuk menonjolkan nada riang/wanita
      utterance.volume = 1;

      // Tunggu voices tersedia (terutama di Chrome)
      const setVoice = () => {
        const voice = getBestVoice();
        if (voice) utterance.voice = voice;
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        setVoice();
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', setVoice, {
          once: true,
        });
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, isMuted, getBestVoice]
  );

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const replay = useCallback(() => {
    if (lastTextRef.current) speak(lastTextRef.current);
  }, [speak]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) stop(); // Jika muting, hentikan suara aktif
      return !prev;
    });
  }, [stop]);

  return {
    isSpeaking,
    isMuted,
    isSupported,
    speak,
    stop,
    replay,
    toggleMute,
  };
}
