// ── TypingIndicator Component ────────────────────────────────────
export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-fade-up">
    
      {/* Bubble typing */}
      <div className="bubble-bot rounded-3xl px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-primary-400 animate-bounce-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
