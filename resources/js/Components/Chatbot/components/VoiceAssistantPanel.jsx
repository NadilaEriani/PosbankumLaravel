// ── VoiceAssistantPanel Component 
// Panel kontrol suara bergaya voice assistant modern (Siri/Google)
import { Mic, MicOff, MessageSquare, X } from 'lucide-react';

export default function VoiceAssistantPanel({
  isListening,
  transcript,
  isLoading,
  isSttSupported,
  onStartListening,
  onStopListening,
  onShowChat,
}) {
  const micDisabled = isLoading;

  return (
    <div className="flex flex-col items-center pb-4 pt-1 px-4">
      {/* Transkrip Real-time */}
      {isListening && transcript && (
        <div className="w-full mx-4 mb-4 p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm animate-pulse-fast">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
            <span className="text-xs font-medium text-blue-700">Mendengarkan...</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-medium min-h-[20px] bg-white/50 px-3 py-2 rounded-xl backdrop-blur-sm">
            {transcript || ''}
          </p>
        </div>
      )}
      
      {/* Label atas */}
      {/* <p className="text-xs text-gray-400 mb-4 font-medium">
        {isListening && !transcript
          ? 'Aku mendengarkan... ucapkan pertanyaanmu'
          : isSttSupported
          ? 'Ketuk untuk bicara'
          : 'Fitur suara tidak didukung di browser ini'}
      </p> */}

      {/* Tombol-tombol horizontal */}
      <div className="flex items-center gap-6">
        {/* Tombol Riwayat Chat */}
        <button
          onClick={onShowChat}
          className="flex flex-col items-center gap-1 group"
        >
          <span className="w-12 h-12 rounded-2xl bg-white border border-primary-100 shadow-soft-sm flex items-center justify-center text-primary-400 group-hover:border-primary-300 group-hover:text-primary-600 transition-all duration-200">
            <MessageSquare size={20} />
          </span>
          <span className="text-[10px] text-gray-400 font-medium">Riwayat</span>
          <span className="text-[9px] text-gray-300">Chat</span>
        </button>

        {/* Tombol Mic Utama */}
        <button
          onClick={isListening ? onStopListening : onStartListening}
          disabled={micDisabled || !isSttSupported}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-300 ease-out
            disabled:opacity-40 disabled:cursor-not-allowed
            ${isListening ? 'mic-listening scale-110' : micDisabled ? 'mic-disabled' : 'mic-idle'}
          `}
        >
          {isListening ? (
            <MicOff size={32} className="text-white" />
          ) : (
            <Mic size={32} className="text-white" />
          )}
        </button>

        {/* Tombol Batal/Stop */}
        <button
          onClick={onStopListening}
          disabled={!isListening}
          className="flex flex-col items-center gap-1 group disabled:opacity-30"
        >
          <span className="w-12 h-12 rounded-2xl bg-white border border-primary-100 shadow-soft-sm flex items-center justify-center text-gray-400 group-hover:border-red-200 group-hover:text-red-400 transition-all duration-200 disabled:cursor-not-allowed">
            <X size={20} />
          </span>
          <span className="text-[10px] text-gray-400 font-medium">Batal</span>
          <span className="text-[9px] text-gray-300">Stop</span>
        </button>
      </div>
    </div>
  );
}
