import { useState, useCallback, useMemo } from 'react';
import { Calendar, MapPin, ArrowRight, Clock, Bus, ChevronLeft, ChevronRight } from 'lucide-react';
import { dispatcherTripAPI } from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  status: string;
  driver_name?: string;
  bus?: { id: number; bus_number: string; bus_type: string };
  route?: { id: number; origin_city: string; destination_city: string };
}

const timeSlots = Array.from({ length: 18 }, (_, i) => {
  const hour = 6 + i;
  return `${String(hour).padStart(2, '0')}:00`;
});

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  BOARDING: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  DEPARTED: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  COMPLETED: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', dot: 'bg-gray-400' },
  ARRIVED: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500' },
  CANCELLED: { bg: 'bg-red-50 border-red-200', text: 'text-red-500', dot: 'bg-red-400' },
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DispatcherSchedulePage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await dispatcherTripAPI.getMyTrips();
      setTrips(res.data.data?.trips || []);
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, refresh } = useAutoRefresh(fetchData, 30000);

  const filteredTrips = useMemo(() => {
    const dateStr = formatDate(selectedDate);
    return trips.filter((t) => t.trip_date === dateStr);
  }, [trips, selectedDate]);

  const tripsBySlot = useMemo(() => {
    const map: Record<string, TripItem[]> = {};
    timeSlots.forEach((s) => (map[s] = []));
    filteredTrips.forEach((trip) => {
      const hour = trip.departure_time?.substring(0, 2);
      const slotKey = `${hour}:00`;
      if (map[slotKey]) map[slotKey].push(trip);
    });
    return map;
  }, [filteredTrips]);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const goToToday = () => setSelectedDate(new Date());

  if (loading) return <TableSkeleton rows={5} cols={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Schedule View</h1>
          <p className="text-sm text-gray-500 mt-1">Daily calendar view of trip schedules</p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Date Picker */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <button onClick={prevDay} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800">{formatDateDisplay(selectedDate)}</p>
            <p className="text-sm text-gray-500">{filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={nextDay} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="flex justify-center mt-3">
          <button
            onClick={goToToday}
            className="px-4 py-1.5 text-sm font-medium text-[#d84e55] bg-[#d84e55]/10 rounded-lg hover:bg-[#d84e55]/20 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(statusColors).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
            <span className="text-gray-600">{status.charAt(0) + status.slice(1).toLowerCase()}</span>
          </div>
        ))}
      </div>

      {/* Day View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {timeSlots.map((slot) => (
            <div key={slot} className="flex min-h-[60px]">
              <div className="w-20 flex-shrink-0 flex items-start justify-center pt-3 text-sm font-medium text-gray-500 border-r border-gray-100 bg-gray-50">
                {slot}
              </div>
              <div className="flex-1 p-2 flex flex-wrap gap-2 items-start">
                {tripsBySlot[slot].length > 0 ? (
                  tripsBySlot[slot].map((trip) => {
                    const colors = statusColors[trip.status] || statusColors.SCHEDULED;
                    return (
                      <div
                        key={trip.id}
                        className={`flex-1 min-w-[200px] max-w-[350px] border rounded-lg p-3 ${colors.bg} transition-shadow hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${colors.text}`}>{trip.status}</span>
                          <span className="text-xs text-gray-500">{trip.departure_time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span>{trip.route?.origin_city}</span>
                          <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span>{trip.route?.destination_city}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Bus className="h-3 w-3" /> {trip.bus?.bus_number}
                          </span>
                          {trip.driver_name && (
                            <span className="truncate">👤 {trip.driver_name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-300 py-2">No trips</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
