import { Wifi, Plug, Snowflake, Music, UtensilsCrossed, Bed, ShieldCheck } from 'lucide-react';

const amenityConfig: Record<string, { icon: any; label: string; colorKey: string }> = {
  wifi: { icon: Wifi, label: 'WiFi', colorKey: 'blue' },
  charging: { icon: Plug, label: 'Charging', colorKey: 'green' },
  ac: { icon: Snowflake, label: 'AC', colorKey: 'cyan' },
  entertainment: { icon: Music, label: 'Entertainment', colorKey: 'purple' },
  food: { icon: UtensilsCrossed, label: 'Food', colorKey: 'orange' },
  sleeper: { icon: Bed, label: 'Sleeper', colorKey: 'indigo' },
  insurance: { icon: ShieldCheck, label: 'Insured', colorKey: 'teal' },
};

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  cyan: 'bg-cyan-50 text-cyan-700',
  purple: 'bg-purple-50 text-purple-700',
  orange: 'bg-orange-50 text-orange-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  teal: 'bg-teal-50 text-teal-700',
  gray: 'bg-gray-50 text-gray-700',
};

interface AmenityBadgeProps {
  amenity: string;
  size?: 'sm' | 'md';
  selected?: boolean;
  onClick?: () => void;
}

export default function AmenityBadge({ amenity, size = 'sm', selected, onClick }: AmenityBadgeProps) {
  const key = amenity.toLowerCase();
  const config = amenityConfig[key] || { icon: null, label: amenity, colorKey: 'gray' };
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const colorClasses = colorMap[config.colorKey] || colorMap.gray;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses} ${colorClasses} transition-all ${onClick ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'} ${selected ? 'ring-2 ring-offset-1 ring-[#d84e55]' : ''}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />}
      {config.label}
    </button>
  );
}
