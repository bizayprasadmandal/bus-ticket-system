import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCog, Ticket, DollarSign, Bus, Route, CreditCard, TrendingUp, RefreshCw, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { dashboardAPI } from '../../api';
import toast from 'react-hot-toast';

interface SystemStats {
  active_trips: number;
  active_buses: number;
  active_routes: number;
  successful_payments: number;
}

interface Stats {
  total_users: number;
  total_operators: number;
  total_bookings: number;
  monthly_commission: number;
  system_stats: SystemStats;
}

interface Activity {
  id: number;
  pnr: string;
  total_amount: number;
  booking_status: string;
  booking_date: string;
  user: { full_name: string; phone_number: string };
  trip: {
    route: { route_name: string; origin_city: string; destination_city: string };
    trip_date: string;
    departure_time: string;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await dashboardAPI.getAdmin();
      const data = res.data.data;
      setStats(data.stats);
      setActivities(data.recent_activity || []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: 'bg-blue-500', lightColor: 'bg-blue-50' },
    { label: 'Operators', value: stats?.total_operators ?? 0, icon: UserCog, color: 'bg-green-500', lightColor: 'bg-green-50' },
    { label: 'Total Bookings', value: stats?.total_bookings ?? 0, icon: Ticket, color: 'bg-purple-500', lightColor: 'bg-purple-50' },
    { label: 'Monthly Commission', value: `Rs. ${(stats?.monthly_commission ?? 0).toLocaleString()}`, icon: DollarSign, color: 'bg-orange-500', lightColor: 'bg-orange-50', isText: true },
  ];

  const systemCards = [
    { label: 'Active Trips', value: stats?.system_stats?.active_trips ?? 0, icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Active Buses', value: stats?.system_stats?.active_buses ?? 0, icon: Bus, color: 'text-green-600' },
    { label: 'Active Routes', value: stats?.system_stats?.active_routes ?? 0, icon: Route, color: 'text-purple-600' },
    { label: 'Successful Payments', value: stats?.system_stats?.successful_payments ?? 0, icon: CreditCard, color: 'text-orange-600' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const href = card.label === 'Total Users' ? '/admin/users' : card.label === 'Operators' ? '/admin/operators' : card.label === 'Total Bookings' ? '/admin/reports' : '#';
          return (
            <Link to={href} key={card.label} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.lightColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* System Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">System Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {systemCards.map((card) => (
            <div key={card.label} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <card.icon className={`h-5 w-5 ${card.color}`} />
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-lg font-bold text-gray-800">{card.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            Auto-refreshes every 30s
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No recent activity</div>
          ) : (
            activities.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.booking_status === 'COMPLETED' ? 'bg-green-500' :
                    activity.booking_status === 'CONFIRMED' ? 'bg-blue-500' :
                    activity.booking_status === 'CANCELLED' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 text-sm">{activity.user?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{activity.user?.phone_number}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {activity.trip?.route?.origin_city} → {activity.trip?.route?.destination_city}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-800">Rs. {activity.total_amount?.toLocaleString()}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.booking_status)}`}>
                    {activity.booking_status}
                  </span>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-400 w-16 text-right">
                  {getTimeAgo(activity.booking_date)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs">Today's Bookings</p>
              <p className="text-2xl font-bold mt-1">
                {activities.filter(a => {
                  const today = new Date().toISOString().split('T')[0];
                  return a.trip?.trip_date === today;
                }).length}
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs">Confirmed</p>
              <p className="text-2xl font-bold mt-1">
                {activities.filter(a => a.booking_status === 'CONFIRMED').length}
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-green-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs">Completed</p>
              <p className="text-2xl font-bold mt-1">
                {activities.filter(a => a.booking_status === 'COMPLETED').length}
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-purple-200" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-xs">Cancelled</p>
              <p className="text-2xl font-bold mt-1">
                {activities.filter(a => a.booking_status === 'CANCELLED').length}
              </p>
            </div>
            <ArrowDownRight className="h-5 w-5 text-red-200" />
          </div>
        </div>
      </div>
    </div>
  );
}