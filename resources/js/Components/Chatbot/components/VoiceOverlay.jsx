import { useEffect } from 'react';
import HeroAssistant from './HeroAssistant';
import AssistantStatusCard from './AssistantStatusCard';
import VoiceAssistantPanel from './VoiceAssistantPanel';
import TypewriterText from './TypewriterText';

function cleanVoiceText(text = '') {
  return text
    .replace(/<[^>]*>/g, '') // hapus HTML tag
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold markdown
    .replace(/\*(.*?)\*/g, '$1') // italic markdown
    .replace(/`(.*?)`/g, '$1') // inline code
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // link markdown
    .replace(/^>\s?/gm, '') // blockquote
    .replace(/^\s*[-*+]\s+/gm, '• ') // bullet list
    .replace(/^\s*\d+\.\s+/gm, (m) => m) // pertahankan numbering
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function VoiceOverlay({
  isOpen,
  onClose,
  assistantState,
  isListening,
  transcript,
  hasVoiceInput,
  isLoading,
  isSttSupported,
  onStartListening,
  onStopListening,
  activeResponse,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const cleanedResponse = cleanVoiceText(activeResponse || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md animate-fade-up"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm max-h-[90vh] bg-gradient-to-b from-white to-[#f0f4ff] rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col pt-8 pb-4 border border-white/50">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          type="button"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto mt-2">
          <HeroAssistant
            state={assistantState}
            hideDescription={activeResponse && assistantState !== 'listening'}
            hasVoiceInput={hasVoiceInput}
          />
        </div>

        {activeResponse && assistantState !== 'listening' ? (
          <div className="mx-4 mb-4 p-4 rounded-3xl bg-sky-50 border border-sky-200 shadow-sm flex items-start gap-3 animate-scale-in h-40">
            <div className="flex-1 min-w-0 h-full overflow-y-auto pr-2 custom-scrollbar flex flex-col">
              <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                <TypewriterText text={cleanedResponse} speedMs={100} />
              </p>
            </div>
          </div>
        ) : (
          <AssistantStatusCard state={assistantState} />
        )}

        <VoiceAssistantPanel
          isListening={isListening}
          transcript={transcript}
          isLoading={isLoading}
          isSttSupported={isSttSupported}
          onStartListening={onStartListening}
          onStopListening={onStopListening}
          onShowChat={onClose}
        />
      </div>
    </div>
  );
}