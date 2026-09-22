import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Ticket, MapPin, ArrowRight, Clock, RefreshCw, Loader2, Users, IndianRupee } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

interface DashboardStats {
  today_trips_count?: number;
  available_seats?: number;
  today_bookings_count?: number;
  today_revenue?: number;
  today_trips?: any[];
  [key: string]: any;
}

export default function CounterAgentDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/counter-agent');
      setStats(res.data.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  const statCards = [
    { label: "Today's Available Trips", value: stats.today_trips_count ?? 0, icon: Calendar, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { label: 'Available Seats', value: stats.available_seats ?? 0, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: "Today's Bookings", value: stats.today_bookings_count ?? 0, icon: Ticket, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: "Today's Revenue", value: `NPR ${(stats.today_revenue || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Counter Agent Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Today's overview and available trips for counter booking.</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Today's Available Trips */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Available Trips for Today</h3>
          <span className="text-sm text-gray-500">{stats.today_trips?.length || 0} trips</span>
        </div>
        {stats.today_trips && stats.today_trips.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.today_trips.map((trip: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-amber-600" />
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
                    <span>{trip.bus?.bus_type}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-800">NPR {trip.current_fare}</p>
                  <p className={`text-xs font-medium ${trip.available_seats <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {trip.available_seats} seats left
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/counter/book?tripId=${trip.id}`)}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors shrink-0 btn-press"
                >
                  Quick Book
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No trips available for today</p>
          </div>
        )}
      </div>
    </div>
  );
}
