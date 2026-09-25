import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Route, Calendar, Ticket, TrendingUp, MapPin, Clock, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { dashboardAPI } from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';
import { bookingStatusLabel } from '../../utils/statusLabels';

interface Stats {
  total_routes?: number;
  total_buses?: number;
  today_trips_count?: number;
  monthly_bookings?: number;
  monthly_revenue?: number;
  today_trips?: any[];
  recent_bookings?: any[];
  [key: string]: any;
}

export default function OperatorDashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await dashboardAPI.getOperator();
      const d = res.data.data || {};
      setStats({ ...d.stats, today_trips: d.today_trips, recent_bookings: d.recent_bookings });
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  const statCards = [
    { label: 'Total Buses', value: stats.total_buses ?? 0, icon: Bus, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Total Routes', value: stats.total_routes ?? 0, icon: Route, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: "Today's Trips", value: stats.today_trips_count ?? 0, icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Monthly Bookings', value: stats.monthly_bookings ?? 0, icon: Ticket, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { label: 'Monthly Revenue', value: `NPR ${(stats.monthly_revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Operator Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's an overview of your operations.</p>
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow card-hover${index < 4 ? ` animate-stagger-in stagger-${index + 1}` : ''}`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Today's Trips</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{stats.today_trips?.length || 0} trips</span>
              <Link to="/operator/trips" className="text-sm text-[#d84e55] font-medium hover:underline btn-press">View All →</Link>
            </div>
          </div>
          {stats.today_trips && stats.today_trips.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.today_trips.map((trip: any, i: number) => (
                <Link key={i} to="/operator/trips" className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
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
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    trip.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                    trip.status === 'BOARDING' ? 'bg-amber-100 text-amber-700' :
                    trip.status === 'DEPARTED' ? 'bg-purple-100 text-purple-700' :
                    trip.status === 'ARRIVED' ? 'bg-green-100 text-green-700' :
                    trip.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {trip.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No trips scheduled for today</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Bookings</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{stats.recent_bookings?.length || 0} bookings</span>
              <Link to="/operator/bookings" className="text-sm text-[#d84e55] font-medium hover:underline btn-press">View All →</Link>
            </div>
          </div>
          {stats.recent_bookings && stats.recent_bookings.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.recent_bookings.slice(0, 10).map((booking: any, i: number) => (
                <Link key={i} to="/operator/bookings" className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{booking.user?.full_name || 'Customer'}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-mono">{booking.pnr}</span>
                      <span>&#8226;</span>
                      <span>{booking.trip?.route?.origin_city} &rarr; {booking.trip?.route?.destination_city}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">NPR {Number(booking.total_amount || 0).toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      booking.booking_status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      booking.booking_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      booking.booking_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {bookingStatusLabel(booking.booking_status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Ticket className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No recent bookings</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white card-hover animate-gradient">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.total_buses || 0}</p>
            <p className="text-blue-100 text-sm">Active Buses</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.total_routes || 0}</p>
            <p className="text-blue-100 text-sm">Routes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.today_trips_count || 0}</p>
            <p className="text-blue-100 text-sm">Today's Trips</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.monthly_bookings || 0}</p>
            <p className="text-blue-100 text-sm">Monthly Bookings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
