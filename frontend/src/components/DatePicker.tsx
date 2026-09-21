import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  label,
  disabled = false,
  className = '',
}: DatePickerProps) {
  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          disabled={disabled}
          className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm font-medium transition-all outline-none ${
            disabled
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
              : value
              ? 'border-gray-300 bg-white text-gray-800 focus:border-[#d84e55] focus:ring-2 focus:ring-[#d84e55]/20'
              : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 focus:border-[#d84e55] focus:ring-2 focus:ring-[#d84e55]/20'
          }`}
          style={{ colorScheme: 'light' }}
        />
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}