import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, CheckCircle, MapPin, ArrowRight, RefreshCw, Loader2, Play, CheckCircle2 } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  status: string;
  bus?: { bus_number: string; bus_type: string };
  route?: { origin_city: string; destination_city: string };
  passenger_count?: number;
  available_seats?: number;
  total_seats?: number;
  [key: string]: any;
}

interface Stats {
  today_trips_count?: number;
  completed_trips?: number;
  upcoming_trips?: number;
  total_passengers?: number;
  today_trips?: TripItem[];
  [key: string]: any;
}

export default function DriverDashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/driver');
      setStats(res.data.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.put(`/trips/${id}/status`, { status });
      toast.success(`Trip marked as ${status.toLowerCase()}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const statCards = [
    { label: "Today's Trips", value: stats.today_trips_count ?? 0, icon: Calendar, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { label: 'Completed', value: stats.completed_trips ?? 0, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: 'Upcoming', value: stats.upcoming_trips ?? 0, icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Total Passengers', value: stats.total_passengers ?? 0, icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ];

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    BOARDING: 'bg-amber-100 text-amber-700',
    DEPARTED: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Driver Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your schedule for today.</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Link to="/driver/trips" className="text-sm text-[#d84e55] font-medium hover:underline">View All →</Link>
          </div>
        </div>
        {stats.today_trips && stats.today_trips.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.today_trips.map((trip: TripItem) => (
              <div key={trip.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-emerald-600" />
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
                    {trip.passenger_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {trip.passenger_count} passengers
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                    {trip.status}
                  </span>
                  {trip.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleStatusUpdate(trip.id, 'DEPARTED')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Play className="h-3 w-3" /> Depart
                    </button>
                  )}
                  {trip.status === 'DEPARTED' && (
                    <button
                      onClick={() => handleStatusUpdate(trip.id, 'COMPLETED')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No trips scheduled for today</p>
          </div>
        )}
      </div>
    </div>
  );
}
