// QuickActions Component
import { MapPin, FileText, Clock, Phone } from 'lucide-react';

const QUICK_ACTIONS = [
  {
    id: 'posbakum-terdekat',
    icon: MapPin,
    label: 'Cek Posbakum Terdekat',
    message: 'Dimana lokasi Posbakum terdekat?',
  },
  {
    id: 'syarat-bantuan',
    icon: FileText,
    label: 'Syarat Bantuan Hukum',
    message: 'Apa saja syarat untuk mendapatkan bantuan hukum gratis?',
  },
  {
    id: 'jam-operasional',
    icon: Clock,
    label: 'Jam Operasional',
    message: 'Jam berapa Posbakum buka dan tutup?',
  },
  {
    id: 'kontak-petugas',
    icon: Phone,
    label: 'Kontak petugas',
    message: 'Bagaimana cara menghubungi petugas Posbakum?',
  },
];

export default function QuickActions({ onSelect, disabled }) {
  return (
    <div className="px-4 mb-4">
      <p className="text-xs font-bold text-gray-700 mb-3">
        Topik Populer:
      </p>
      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              id={`quick-${action.id}`}
              disabled={disabled}
              onClick={() => onSelect(action.message)}
              className={`
                flex items-center gap-2 p-2 
                border border-primary-300 bg-primary-50
                hover:border-primary-500 hover:bg-primary-100
                text-left text-xs font-semibold text-gray-800
                transition-all duration-200 rounded-lg
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="bg-primary-50 text-primary-600 p-1 rounded-full flex-shrink-0">
                <Icon size={14} strokeWidth={2.5} />
              </div>
              <span className="leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
