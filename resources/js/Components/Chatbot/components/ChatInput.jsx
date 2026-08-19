// ── ChatInput Component ──────────────────────────────────────────
import { useRef, useEffect, useState } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';

export default function ChatInput({
  value,
  onChange,
  onSend,
  onMicClick,
  isListening,
  isLoading,
  isSttSupported,
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div className="sticky bottom-0 z-20 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-5 py-4">
        <div className="flex items-end gap-3">
          {/* Mic button */}
          {isSttSupported && (
            <button
              onClick={onMicClick}
              disabled={isLoading}
              title={isListening ? 'Stop mendengarkan' : 'Ucapkan pertanyaan'}
              className={`
                flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                transition-all duration-200
                disabled:opacity-40 disabled:cursor-not-allowed
                ${isListening
                  ? 'bg-primary-100 text-primary-600 border border-primary-300 shadow-inner'
                  : 'bg-gray-50 text-gray-400 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
                }
              `}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          {/* Textarea */}
          <div className="flex-1 flex items-end bg-white border border-gray-200 rounded-3xl overflow-hidden transition-colors duration-200">
            <textarea
              ref={textareaRef}
              id="chat-input"
              rows={1}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan Anda..."
              disabled={isLoading}
              className="flex-1 px-5 py-3.5 text-sm text-gray-800 placeholder-gray-400 bg-transparent resize-none outline-none border-none focus:ring-0 focus:outline-none leading-relaxed disabled:opacity-60 max-h-[120px]"
            />
            {/* Help Icon Placeholder (Optional) */}
            <button
              onClick={() => setIsHelpOpen(true)}
              aria-label="Buka panduan bantuan"
              role="button"
              tabIndex={0}
              className="p-3 mr-2 text-gray-300 cursor-help hover:text-gray-500 hover:bg-gray-100 rounded-full transition-all duration-200 flex-shrink-0"
              title="Bantuan"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="focus-visible:ring-2 focus-visible:ring-primary-400"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </button>
          </div>

          {/* Send button */}
          <button
            id="send-btn"
            onClick={onSend}
            disabled={!canSend}
            className={`
              flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
              transition-all duration-200
              ${canSend
                ? 'bg-primary-600 text-white shadow hover:bg-primary-500 hover:scale-105 active:scale-95'
                : 'bg-gray-400/80 text-white cursor-not-allowed'
              }
            `}
          >
            <Send size={20} className={canSend ? 'ml-0.5' : ''} />
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-400/80 mt-3 pb-2 font-medium">
          Powered by <strong>PARIS </strong>POSBAKUM AI
        </p>
      </div>

  {/* Help Modal */}
{isHelpOpen && (
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onClick={() => setIsHelpOpen(false)}
    />

    {/* Modal */}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">

          <div className="flex items-center gap-3">
            {/* Help Icon (fixed) */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-700"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Panduan
              </h3>
              <p className="text-xs text-gray-500">
                Posbankum AI Assistant
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsHelpOpen(false)}
            aria-label="Tutup"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content (Card Style) */}
        <div className=" px-5 py-4 space-y-2 text-xs ">
          {[
            {
              title: "Kirim pesan",
              desc: "Ketik pertanyaan lalu tekan Enter.",
            },
            {
              title: "Kirim Voice",
              desc: "Klik ikon mikrofon untuk bicara, klik lagi untuk berhenti.",
            },
            // {
            //   title: "Contoh",
            //   custom: (
            //     <ul className="mt-1 space-y-1 text-gray-500">
            //       <li>• Apa itu Posbankum?</li>
            //       <li>• Berapa biaya layanan Posbankum?</li>
            //     </ul>
            //   ),
            // },
            {
              title: "Reset",
              desc: "Klik ikon sampah untuk menghapus chat.",
            },
            {
              title: "Suara",
              desc: "Klik ikon speaker untuk mendengar respons, klik lagi untuk mute.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 transition hover:bg-gray-100"
            >
              <p className="text-gray-800 font-medium">
                {item.title}
              </p>

              {item.desc && (
                <p className="text-gray-500 mt-0.5 leading-snug">
                  {item.desc}
                </p>
              )}

              {item.custom}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1">
          <button
            onClick={() => setIsHelpOpen(false)}
            className="w-full py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  </>
)}
    </div>
  );
}
