// ── useSpeechToText Hook ─────────────────────────────────────────
import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export function useSpeechToText({ onResult, onEnd } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported] = useState(() => !!SpeechRecognition);
  const recognitionRef = useRef(null);

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      const interimResults = Array.from(event.results)
        .filter(r => r && r[0] && r[0].transcript)
        .map((r) => r[0].transcript.trim())
        .filter(t => t.length > 0)
        .join(' ');
      setTranscript(interimResults);

      const finalResult = Array.from(event.results)
        .filter(r => r.isFinal && r[0] && r[0].transcript)
        .map((r) => r[0].transcript.trim())
        .filter(t => t.length > 0)
        .join(' ');

      if (finalResult && onResult) {
        onResult(finalResult);
      }
    };

    // recognition.onerror = (event) => {
    //   console.warn('[STT] Error:', event.error);
      
    //   // Handle common errors gracefully
    //   if (event.error === 'no-speech') {
    //     setTranscript('Tidak ada suara terdeteksi. Coba bicara lebih keras atau dekatkan mikrofon.');
    //   } else if (event.error === 'audio-capture') {
    //     setTranscript('Tidak bisa akses mikrofon. Izinkan akses mikrofon di browser.');
    //   }
      
    //   setIsListening(false);
    // };
    recognition.onerror = (event) => {
      console.warn('[STT] Error:', event.error);
      
      if (event.error === 'no-speech') {
        setTranscript('Tidak ada suara. Coba bicara lebih keras.');
      } else if (event.error === 'audio-capture') {
        setTranscript('Gagal mengakses hardware mikrofon.');
      } else if (event.error === 'not-allowed') {
        setTranscript('Browser MEMBLOKIR mikrofon! Izinkan akses di gembok URL bar atas (coba gunakan localhost).');
      } else if (event.error === 'network') {
        setTranscript('Koneksi terputus: Edge/Browser gagal menghubungi server pengenalan suara.');
      } else {
        setTranscript('Error mikrofon: ' + event.error);
      }
      
      setIsListening(false);
    };

    recognition.onnomatch = () => {
      setTranscript('Suara tidak dikenali.');
      setIsListening(false);
    };


    recognition.onend = () => {
      setIsListening(false);
      setTranscript('');
      if (onEnd) onEnd();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, isListening, onResult, onEnd]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setTranscript('');
  }, []);

  return { isListening, transcript, isSupported, startListening, stopListening };
}
