// ── AssistantStatusCard Component ───────────────────────────────
// Card status yang berubah sesuai state: idle / listening / speaking

const STATUS_CONFIG = {
  idle: {
    bg:      'from-white to-primary-50',
    border:  'border-primary-100',
    dot:     'bg-emerald-400',
    title:   'Siap membantu kamu',
    subtitle: 'Ketik atau ucapkan pertanyaanmu',
    icon:    '💬',
  },
  listening: {
    bg:      'from-primary-50 to-indigo-50',
    border:  'border-primary-200',
    dot:     'bg-primary-500 animate-pulse',
    title:   'Aku mendengarkan...',
    subtitle: 'Coba ucapkan apa yang ingin kamu tanyakan.',
    icon:    '🎙️',
  },
  speaking: {
    bg:      'from-sky-50 to-blue-50',
    border:  'border-sky-200',
    dot:     'bg-sky-500 animate-pulse',
    title:   'Aku sedang menjawab...',
    subtitle: 'Mohon tunggu sebentar ya.',
    icon:    '🔊',
  },
};

export default function AssistantStatusCard({ state = 'idle' }) {
  const cfg = STATUS_CONFIG[state] || STATUS_CONFIG.idle;

  return (
    <div
      className={`
        mx-4 mb-4 rounded-3xl border bg-gradient-to-br ${cfg.bg} ${cfg.border}
        p-4 flex items-center gap-3 shadow-soft-sm
        transition-all duration-500 ease-in-out
      `}
    >
      {/* Icon */}
      <span className="text-2xl flex-shrink-0">{cfg.icon}</span>

      {/* Teks */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 text-sm leading-tight">
          {cfg.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{cfg.subtitle}</p>
      </div>

      {/* Indikator dot */}
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
    </div>
  );
}
