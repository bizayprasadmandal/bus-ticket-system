import { useState, useEffect } from 'react';
import { Bus, Route, Calendar, Ticket, TrendingUp, Users, MapPin, Clock } from 'lucide-react';
import { dashboardAPI } from '../../api';
import toast from 'react-hot-toast';

interface Stats {
  total_buses?: number;
  total_routes?: number;
  total_trips?: number;
  total_bookings?: number;
  total_revenue?: number;
  total_passengers?: number;
  upcoming_trips?: any[];
  recent_bookings?: any[];
  [key: string]: any;
}

export default function OperatorDashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getOperator()
      .then((res) => setStats(res.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setIsLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Buses', value: stats.total_buses ?? 0, icon: Bus, color: 'bg-blue-500', bgColor: 'bg-blue-50' },
    { label: 'Total Routes', value: stats.total_routes ?? 0, icon: Route, color: 'bg-green-500', bgColor: 'bg-green-50' },
    { label: 'Total Trips', value: stats.total_trips ?? 0, icon: Calendar, color: 'bg-purple-500', bgColor: 'bg-purple-50' },
    { label: 'Total Bookings', value: stats.total_bookings ?? 0, icon: Ticket, color: 'bg-orange-500', bgColor: 'bg-orange-50' },
    { label: 'Revenue', value: `NPR ${(stats.total_revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-500', bgColor: 'bg-emerald-50' },
    { label: 'Passengers', value: stats.total_passengers ?? 0, icon: Users, color: 'bg-pink-500', bgColor: 'bg-pink-50' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Operator Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back! Here's an overview of your operations.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Trips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Trips</h3>
          {stats.upcoming_trips?.length > 0 ? (
            <div className="space-y-3">
              {stats.upcoming_trips.slice(0, 5).map((trip: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium text-gray-800">{trip.route?.origin_city}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-800">{trip.route?.destination_city}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {trip.departure_time}
                      </span>
                      <span>{trip.bus?.bus_number}</span>
                      <span>{trip.available_seats} seats left</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">NPR {trip.current_fare}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No upcoming trips</p>
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Bookings</h3>
          {stats.recent_bookings?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_bookings.slice(0, 5).map((booking: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{booking.user?.full_name || 'Customer'}</p>
                    <p className="text-xs text-gray-500">PNR: {booking.pnr}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">NPR {booking.total_amount}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
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

      {/* Quick Stats Bar */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
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
            <p className="text-3xl font-bold">{stats.total_trips || 0}</p>
            <p className="text-blue-100 text-sm">Total Trips</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.total_bookings || 0}</p>
            <p className="text-blue-100 text-sm">Bookings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
