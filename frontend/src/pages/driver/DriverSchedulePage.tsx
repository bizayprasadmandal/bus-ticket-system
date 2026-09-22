import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Clock, ArrowRight, Bus, Download } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  status: string;
  bus?: { bus_number: string; bus_type: string };
  route?: { origin_city: string; destination_city: string };
  [key: string]: any;
}

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
  BOARDING: 'bg-amber-100 text-amber-700 border-amber-200',
  DEPARTED: 'bg-green-100 text-green-700 border-green-200',
  ARRIVED: 'bg-purple-100 text-purple-700 border-purple-200',
  COMPLETED: 'bg-gray-100 text-gray-600 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function DriverSchedulePage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/trips/driver/schedule', {
        params: { start_date: startDate, end_date: endDate },
      });
      setTrips(res.data.data?.trips || res.data.data || []);
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadData, 30000);

  const tripsByDate = useMemo(() => {
    const map: Record<string, TripItem[]> = {};
    weekDates.forEach((d) => {
      map[formatDate(d)] = [];
    });
    trips.forEach((trip) => {
      if (map[trip.trip_date]) {
        map[trip.trip_date].push(trip);
      }
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => a.departure_time.localeCompare(b.departure_time));
    });
    return map;
  }, [trips, weekDates]);

  const goToPrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const goToNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  if (loading) return <TableSkeleton rows={5} cols={7} />;

  const exportCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportSchedule = () => {
    const allTrips = Object.entries(tripsByDate).flatMap(([dateKey, dayTrips]) => {
      return dayTrips.map(trip => {
        const date = new Date(dateKey + 'T00:00:00');
        const dayName = fullDayNames[date.getDay() === 0 ? 6 : date.getDay() - 1];
        return {
          Day: dayName,
          Route: `${trip.route?.origin_city || ''} → ${trip.route?.destination_city || ''}`,
          Departure: trip.departure_time,
          Arrival: trip.arrival_time || '',
          Bus: trip.bus?.bus_number || '',
        };
      });
    });
    if (allTrips.length === 0) {
      toast.error('No schedule to export');
      return;
    }
    exportCSV(allTrips, 'weekly-schedule.csv', ['Day', 'Route', 'Departure', 'Arrival', 'Bus']);
    toast.success('CSV exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Weekly Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={handleExportSchedule}
            disabled={trips.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={goToPrevWeek}
          className="p-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-[#d84e55] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Today
        </button>
        <button
          onClick={goToNextWeek}
          className="p-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-gray-100">
          {weekDates.map((date, i) => {
            const dateKey = formatDate(date);
            const dayTrips = tripsByDate[dateKey] || [];
            const today = isToday(date);
            return (
              <div key={dateKey} className="min-h-[400px]">
                <div className={`p-3 text-center border-b border-gray-100 ${today ? 'bg-[#d84e55]/5' : ''}`}>
                  <p className="text-xs text-gray-500">{dayNames[i]}</p>
                  <p className={`text-lg font-bold ${today ? 'text-[#d84e55]' : 'text-gray-800'}`}>
                    {date.getDate()}
                  </p>
                  {today && <span className="inline-block w-1.5 h-1.5 bg-[#d84e55] rounded-full mt-1" />}
                </div>
                <div className="p-2 space-y-2">
                  {dayTrips.length > 0 ? (
                    dayTrips.map((trip) => (
                      <Link
                        key={trip.id}
                        to={`/driver/trip/${trip.id}`}
                        className={`block p-2 rounded-lg border text-xs transition-colors hover:shadow-sm ${statusColors[trip.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
                      >
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                          <Clock className="h-2.5 w-2.5" />
                          {trip.departure_time}
                        </div>
                        <div className="flex items-center gap-1 font-medium text-gray-800 truncate">
                          <span className="truncate">{trip.route?.origin_city}</span>
                          <ArrowRight className="h-2.5 w-2.5 shrink-0 text-gray-400" />
                          <span className="truncate">{trip.route?.destination_city}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                          <Bus className="h-2.5 w-2.5" />
                          {trip.bus?.bus_number}
                        </div>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                          {trip.status}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 text-center py-4">No trips</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
