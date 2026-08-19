import { Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const isHtmlString = (text = '') => /<[^>]+>/.test(text);

const stripOuterDiv = (text = '') => {
  return text.replace(/^\s*<div[^>]*>([\s\S]*)<\/div>\s*$/i, '$1').trim();
};

export default function MessageBubble({ message, onReplay }) {
  const isUser = message?.role === 'user';
  const text = message?.text || '';

  return (
    <div
      className={`flex items-end gap-2 animate-fade-up ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-sm flex-shrink-0 self-end mb-1 overflow-hidden">
          <img
            src="/assets/burung_serindit.png"
            alt="PARIS"
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      )}

      <div
        className={`flex flex-col max-w-[78%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`
            rounded-3xl px-4 py-3 text-sm leading-relaxed break-words
            ${isUser ? 'bubble-user whitespace-pre-wrap' : 'bubble-bot'}
          `}
        >
          {isUser ? (
            <div>{text}</div>
          ) : isHtmlString(text) ? (
            <div
              className="message-content"
              dangerouslySetInnerHTML={{ __html: stripOuterDiv(text) }}
            />
          ) : (
            <div className="message-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  a: ({ ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div
          className={`flex items-center gap-1.5 mt-1 px-1 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="text-[10px] text-gray-400">
            {formatTime(message?.ts)}
          </span>

          {!isUser && onReplay && text && (
            <button
              onClick={() => onReplay(text)}
              className="text-gray-300 hover:text-primary-500 transition-colors duration-200"
              title="Putar ulang"
              type="button"
            >
              <Volume2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}