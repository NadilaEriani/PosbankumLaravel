// ── ChatHeader Component ─────────────────────────────────────────
import { Trash2, Volume2, VolumeX, X } from 'lucide-react';

export default function ChatHeader({
  isMuted,
  onToggleMute,
  onClearChat,
  onClose,
}) {
  return (
    <header className="sticky top-0 z-30 bg-primary-600 rounded-t-[1.5rem] lg:rounded-none">
      <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
        {/* Avatar kecil */}
        <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border-2 border-primary-500">
          <img src="/assets/burung_serindit.png" alt="PARIS" className="w-full h-full rounded-full object-cover" />
        </div>

        {/* Judul & Status */}
        <div className="flex-1 min-w-0 text-white">
          <h1 className="text-base md:text-lg font-bold leading-tight flex items-center gap-2">
            Chatbot Posbankum
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white flex-shrink-0" />
            <span className="text-xs text-white/90">Aktif sekarang</span>
          </div>
        </div>

        {/* Aksi */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Mute / Unmute */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Aktifkan suara' : 'Matikan suara'}
            className="p-1.5 md:p-2 rounded-full text-white/80 bg-white/10 hover:bg-white/20 transition-all duration-200"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Clear Chat */}
          <button
            onClick={onClearChat}
            title="Hapus percakapan"
            className="hidden md:flex p-1.5 md:p-2 rounded-full text-white/80 bg-white/10 hover:bg-white/20 hover:text-red-300 transition-all duration-200"
          >
            <Trash2 size={16} />
          </button>



          {/* Close Widget */}
          <button
            onClick={onClose}
            title="Tutup obrolan"
            className="p-1.5 md:p-2 rounded-full text-white/80 bg-white/10 hover:bg-red-500 transition-all duration-200"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
