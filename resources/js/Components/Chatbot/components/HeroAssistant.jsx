// ── HeroAssistant Component ──────────────────────────────────────
// Avatar utama dengan video idle/talking dan fallback CSS avatar
import { useRef, useEffect } from 'react';

const AVATAR_STATE = {
  idle: { glowClass: 'avatar-glow-idle', label: 'Siap membantu kamu' },
  listening: { glowClass: 'avatar-glow-listening', label: 'Aku mendengarkan...' },
  speaking: { glowClass: 'avatar-glow-speaking', label: 'Aku sedang menjawab...' },
};

export default function HeroAssistant({ state = 'idle', hideDescription = false, hasVoiceInput = false }) {
  const idleVideoRef = useRef(null);
  const talkingVideoRef = useRef(null);

  // Switch antara idle.mp4 dan talking.mp4 berdasarkan state
  useEffect(() => {
    const idle = idleVideoRef.current;
    const talking = talkingVideoRef.current;
    if (!idle || !talking) return;

    if (state === 'speaking') {
      idle.style.opacity = '0';
      talking.style.opacity = '1';
      talking.play().catch(() => { });
    } else {
      talking.style.opacity = '0';
      idle.style.opacity = '1';
      idle.play().catch(() => { });
    }
  }, [state]);

  const { glowClass } = AVATAR_STATE[state] || AVATAR_STATE.idle;

  return (
    <div className="flex flex-col items-center pt-6 pb-4 px-4 select-none">
      {/* Greeting - hide setelah voice input */}
      <div className={`transition-all duration-500 ease-out overflow-hidden ${hasVoiceInput ? 'opacity-0 max-h-0 py-0 my-0' : 'opacity-100 max-h-32 py-0 my-0'}`}>
        <div className="flex flex-col items-center mb-1">
          <p className="text-sm font-medium text-gray-500 text-center">Hi, aku</p>
          <h2 className="text-3xl font-extrabold text-gradient-primary mt-1 mb-0">PARIS 👋</h2>
        </div>
        <p className="text-sm text-gray-500 text-center mb-1 font-semibold text-xs tracking-wide uppercase text-primary-500">
          Paralegal · Responsif · Integritas
        </p>
        <p className="text-sm text-gray-500 text-center mb-6">Siap bantu kamu hari ini</p>
      </div>

      {/* Avatar container */}
      <div className="relative mb-4">
        {/* Ripple rings saat listening */}
        {state === 'listening' && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary-400 opacity-20 animate-ripple" />
            <span className="absolute inset-0 rounded-full bg-primary-400 opacity-15 animate-ripple [animation-delay:0.5s]" />
            <span className="absolute inset-0 rounded-full bg-primary-400 opacity-10 animate-ripple [animation-delay:1s]" />
          </>
        )}

        {/* Avatar circle */}
        <div
          className={`
            relative ${hasVoiceInput ? 'w-48 h-48 mt-4 -translate-y-4' : 'w-40 h-40'}
            rounded-full overflow-hidden
            transition-all duration-700 ${glowClass}
            bg-gradient-to-br from-primary-100 to-sky-100
          `}
        >
          {/* Video: idle (default) */}
          <video
            ref={idleVideoRef}
            src="/assets/idle.mp4"
            loop muted playsInline autoPlay disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: 1, zIndex: 1 }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          {/* Video: talking */}
          <video
            ref={talkingVideoRef}
            src="/assets/talking.mp4"
            loop muted playsInline disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: 0, zIndex: 2 }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          {/* Fallback avatar (tampil jika video gagal load) */}
          {/* <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="flex flex-col items-center gap-1">
              <span className="text-6xl">👩‍⚖️</span>
            </div>
          </div> */}

          {/* Waveform overlay saat speaking */}
          {state === 'speaking' && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center items-end gap-1 z-10">
              {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-white/80 rounded-full animate-wave-bar"
                  style={{
                    height: `${h * 4}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Informasi singkat */}
      {!hideDescription && (
        <p className="text-xs text-center text-gray-400 max-w-xs leading-relaxed">
          Tanyakan informasi seputar bantuan hukum dasar dengan mudah, cepat, dan ramah.
        </p>
      )}
    </div>
  );
}
