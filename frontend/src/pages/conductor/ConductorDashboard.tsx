import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, TrendingUp, MapPin, Clock, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  status: string;
  passenger_count?: number;
  revenue?: number;
  route?: { origin_city: string; destination_city: string };
  bus?: { bus_number: string; bus_type: string };
}

interface Stats {
  total_trips?: number;
  total_passengers?: number;
  today_revenue?: number;
  today_trips?: TripItem[];
  [key: string]: any;
}

export default function ConductorDashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/conductor');
      setStats(res.data.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  const statCards = [
    { label: 'Total Trips', value: stats.total_trips ?? 0, icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Total Passengers', value: stats.total_passengers ?? 0, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: "Today's Revenue", value: `NPR ${(stats.today_revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Conductor Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's an overview of your trips.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors btn-press"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow card-hover animate-stagger-in stagger-${index + 1}`}>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Today's Trips</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{stats.today_trips?.length || 0} trips</span>
            <Link to="/conductor/trips" className="text-sm text-[#d84e55] font-medium hover:underline btn-press">View All →</Link>
          </div>
        </div>
        {stats.today_trips && stats.today_trips.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.today_trips.map((trip: TripItem, i: number) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
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
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-medium">{trip.passenger_count ?? 0}</span>
                  </div>
                  {trip.revenue !== undefined && (
                    <p className="text-xs text-green-600 font-medium mt-0.5">NPR {trip.revenue.toLocaleString()}</p>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  trip.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                  trip.status === 'BOARDING' ? 'bg-amber-100 text-amber-700' :
                  trip.status === 'DEPARTED' ? 'bg-purple-100 text-purple-700' :
                  trip.status === 'ARRIVED' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {trip.status}
                </span>
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

      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white card-hover animate-gradient">
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.total_trips || 0}</p>
            <p className="text-purple-100 text-sm">Total Trips</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.total_passengers || 0}</p>
            <p className="text-purple-100 text-sm">Total Passengers</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">NPR {(stats.today_revenue || 0).toLocaleString()}</p>
            <p className="text-purple-100 text-sm">Today's Revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
