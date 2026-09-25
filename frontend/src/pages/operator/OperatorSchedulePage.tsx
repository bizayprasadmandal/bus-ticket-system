import { useState, useCallback, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Bus, Loader2, RefreshCw, X } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  status: string;
  available_seats: number;
  route?: { origin_city: string; destination_city: string };
  bus?: { bus_number: string; bus_type: string; total_seats?: number };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-500',
  BOARDING: 'bg-amber-500',
  DEPARTED: 'bg-purple-500',
  ARRIVED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

const TODAY_NPT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date());

export default function OperatorSchedulePage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Scope the query to the visible month (backend supports date_from/date_to)
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      const monthStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const monthEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
      const res = await api.get('/trips/operator/my-trips', { params: { date_from: monthStart, date_to: monthEnd } });
      setTrips(res.data.data?.trips || res.data.data || []);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const tripsByDate = useMemo(() => {
    const map: Record<string, TripItem[]> = {};
    trips.forEach((trip) => {
      const dateKey = trip.trip_date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(trip);
    });
    return map;
  }, [trips]);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [firstDay, daysInMonth]);

  const selectedDayTrips = useMemo(() => {
    if (selectedDay === null) return [];
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return tripsByDate[dateKey] || [];
  }, [selectedDay, year, month, tripsByDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-[#d84e55]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Trip Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">Visual calendar of all your trips</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;

              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTrips = tripsByDate[dateKey] || [];
              const isToday = dateKey === TODAY_NPT;
              const isSelected = selectedDay === day;
              const tripCount = dayTrips.length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative p-2 min-h-[60px] rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-[#d84e55] bg-[#d84e55]/5'
                      : isToday
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {tripCount > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {dayTrips.slice(0, 3).map((t, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${statusColors[t.status] || 'bg-gray-400'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500">{tripCount}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-gray-500 capitalize">{status.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - Selected Day Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedDay !== null
                ? `${MONTH_NAMES[month]} ${selectedDay}, ${year}`
                : 'Select a Day'}
            </h3>
            {selectedDay !== null && (
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {selectedDay === null ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Click on a day to view trip details</p>
            </div>
          ) : selectedDayTrips.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No trips scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{selectedDayTrips.length} trip(s) scheduled</p>
              {selectedDayTrips.map((trip) => (
                <div key={trip.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-800">{trip.departure_time}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      trip.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                      trip.status === 'BOARDING' ? 'bg-amber-100 text-amber-700' :
                      trip.status === 'DEPARTED' ? 'bg-purple-100 text-purple-700' :
                      trip.status === 'ARRIVED' ? 'bg-green-100 text-green-700' :
                      trip.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {trip.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span>{trip.route?.origin_city}</span>
                    <span className="text-gray-400">→</span>
                    <span>{trip.route?.destination_city}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Bus className="h-3 w-3" />
                    <span>{trip.bus?.bus_number} ({trip.bus?.bus_type})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Seats: {(trip.bus?.total_seats ?? 0) - (trip.available_seats ?? 0)}/{trip.bus?.total_seats ?? 0}
                    </span>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-[#d84e55] h-1.5 rounded-full"
                        style={{
                          width: `${
                            trip.bus?.total_seats
                              ? (((trip.bus.total_seats - (trip.available_seats ?? 0)) / trip.bus.total_seats) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
