import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, RefreshCw, Loader2, ArrowRight, CheckCircle, Bus, Users, PlayCircle, ClipboardList } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  status: string;
  bus?: { id: number; bus_number: string; bus_type: string };
  route?: { id: number; origin_city: string; destination_city: string };
}

interface BusItem {
  id: number;
  bus_number: string;
  bus_model: string;
  bus_type: string;
  total_seats: number;
  status: string;
}

interface DashboardStats {
  total_trips?: number;
  boarding?: number;
  departed?: number;
  completed?: number;
  scheduled?: number;
  today_trips?: TripItem[];
  available_buses_list?: BusItem[];
  [key: string]: any;
}

export default function DispatcherDashboard() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/dispatcher');
      setStats(res.data.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  const handleQuickStatusUpdate = async (tripId: number, newStatus: string) => {
    try {
      await api.put(`/trips/${tripId}/status`, { status: newStatus });
      toast.success('Status updated');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const statCards = [
    { label: 'Total Trips Today', value: stats.total_trips ?? 0, icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Boarding', value: stats.boarding ?? 0, icon: Users, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { label: 'Departed', value: stats.departed ?? 0, icon: PlayCircle, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Completed', value: stats.completed ?? 0, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: 'Scheduled', value: stats.scheduled ?? 0, icon: ClipboardList, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  ];

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    BOARDING: 'bg-amber-100 text-amber-700',
    DEPARTED: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  const nextStatusMap: Record<string, string> = {
    SCHEDULED: 'BOARDING',
    BOARDING: 'DEPARTED',
    DEPARTED: 'COMPLETED',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dispatcher Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of today's trips and their statuses.</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{card.label}</p>
                  <p className="text-lg font-bold text-gray-800">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Trips */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Today's Trips</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{stats.today_trips?.length || 0} trips</span>
            <Link to="/dispatcher/trips" className="text-sm text-[#d84e55] font-medium hover:underline">View All →</Link>
          </div>
        </div>
        {stats.today_trips && stats.today_trips.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.today_trips.map((trip: TripItem) => (
              <div key={trip.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bus className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span className="font-medium text-gray-800">{trip.route?.origin_city}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="font-medium text-gray-800">{trip.route?.destination_city}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {trip.departure_time}
                    </span>
                    <span>{trip.bus?.bus_number}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                  {trip.status}
                </span>
                {nextStatusMap[trip.status] && (
                  <button
                    onClick={() => handleQuickStatusUpdate(trip.id, nextStatusMap[trip.status])}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Mark {nextStatusMap[trip.status]}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No trips scheduled for today</p>
          </div>
        )}
      </div>

      {/* Available Buses */}
      {stats.available_buses_list && stats.available_buses_list.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Available Buses</h3>
            <Link to="/dispatcher/buses" className="text-sm text-[#d84e55] font-medium hover:underline">View All →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.available_buses_list.map((bus) => (
              <div key={bus.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bus className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{bus.bus_number}</p>
                  <p className="text-xs text-gray-500">{bus.bus_type} · {bus.total_seats} seats</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bus.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {bus.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
