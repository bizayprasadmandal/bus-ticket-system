import { useState, useEffect } from 'react';
import { TrendingUp, Users, Bus, Ticket, DollarSign, ArrowUpRight, ArrowRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface SummaryData {
  new_users_this_month: number;
  new_operators: number;
  bookings_growth: number;
  revenue_growth: number;
  total_bookings: number;
  total_revenue: number;
}

interface DailyTrend {
  date: string;
  count: number;
}

interface RouteData {
  origin_city: string;
  destination_city: string;
  bookings: number;
  revenue: number;
  avg_fare: number;
}

interface HourData {
  hour: number;
  count: number;
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [hourData, setHourData] = useState<HourData[]>([]);
  const [totalSearches, setTotalSearches] = useState(0);
  const [totalBookingsCompleted, setTotalBookingsCompleted] = useState(0);
  const [totalPaidPayments, setTotalPaidPayments] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [dashRes, routeRes, hourRes, trendRes] = await Promise.allSettled([
        api.get('/dashboard/admin'),
        api.get('/reports/bookings', { params: { group_by: 'route' } }),
        api.get('/reports/bookings', { params: { group_by: 'hour' } }),
        api.get('/reports/bookings', { params: { group_by: 'date' } }),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data.data;
        const stats = d.stats ?? d;
        const sys = stats.system_stats ?? d.system_stats ?? {};
        setSummary({
          new_users_this_month: stats.new_users_this_month ?? sys.total_users ?? stats.total_users ?? 0,
          new_operators: stats.new_operators ?? sys.total_operators ?? stats.total_operators ?? 0,
          bookings_growth: stats.bookings_growth ?? 0,
          revenue_growth: stats.revenue_growth ?? 0,
          total_bookings: stats.total_bookings ?? 0,
          total_revenue: stats.total_revenue ?? 0,
        });
        setTotalSearches(stats.total_searches ?? sys.total_searches ?? 0);
        setTotalBookingsCompleted(stats.total_bookings_completed ?? stats.total_bookings ?? 0);
        setTotalPaidPayments(stats.total_paid_payments ?? 0);
      }

      if (routeRes.status === 'fulfilled') {
        const bookings = routeRes.value.data.data?.bookings ?? [];
        const routeMap = new Map<string, { origin_city: string; destination_city: string; bookings: number; revenue: number; total_fare: number }>();
        for (const b of bookings) {
          const parts = (b.route || ' → ').split(' → ');
          const key = b.route || 'Unknown';
          const existing = routeMap.get(key) || { origin_city: parts[0] || 'Unknown', destination_city: parts[1] || 'Unknown', bookings: 0, revenue: 0, total_fare: 0 };
          existing.bookings += 1;
          existing.revenue += b.total_amount || 0;
          existing.total_fare += b.total_amount || 0;
          routeMap.set(key, existing);
        }
        const routes = Array.from(routeMap.values())
          .map(r => ({ ...r, avg_fare: r.bookings > 0 ? Math.round(r.total_fare / r.bookings) : 0 }))
          .sort((a, b) => b.bookings - a.bookings);
        setRouteData(routes);
      }

      if (hourRes.status === 'fulfilled') {
        const bookings = hourRes.value.data.data?.bookings ?? [];
        const hourMap = new Map<number, number>();
        for (let h = 0; h < 24; h++) hourMap.set(h, 0);
        for (const b of bookings) {
          const d = new Date(b.booking_date);
          const hour = d.getHours();
          hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        }
        setHourData(Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count })));
      }

      if (trendRes.status === 'fulfilled') {
        const bookings = trendRes.value.data.data?.bookings ?? [];
        const dayMap = new Map<string, number>();
        for (const b of bookings) {
          const date = b.booking_date?.split('T')[0] || 'unknown';
          dayMap.set(date, (dayMap.get(date) || 0) + 1);
        }
        setDailyTrends(Array.from(dayMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)));
      }
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const peakHour = hourData.length > 0
    ? hourData.reduce((max, h) => h.count > max.count ? h : max, hourData[0])
    : null;

  const topRoutes = routeData.slice(0, 10);

  const searchToBooking = totalSearches > 0 ? ((totalBookingsCompleted / totalSearches) * 100).toFixed(1) : '0';
  const bookingToPayment = totalBookingsCompleted > 0 ? ((totalPaidPayments / totalBookingsCompleted) * 100).toFixed(1) : '0';

  if (loading) return <TableSkeleton rows={5} cols={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#d84e55]" /> Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">In-depth analytics and growth insights</p>
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-[#d84e55]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">New Users (This Month)</p>
              <p className="text-2xl font-bold text-gray-800">{summary?.new_users_this_month ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">New Operators</p>
              <p className="text-2xl font-bold text-gray-800">{summary?.new_operators ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Ticket className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bookings Growth</p>
              <p className={`text-2xl font-bold ${(summary?.bookings_growth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(summary?.bookings_growth ?? 0) >= 0 ? '+' : ''}{summary?.bookings_growth ?? 0}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenue Growth</p>
              <p className={`text-2xl font-bold ${(summary?.revenue_growth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(summary?.revenue_growth ?? 0) >= 0 ? '+' : ''}{summary?.revenue_growth ?? 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Users Line Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily New Users (Last 30 Days)</h3>
        {dailyTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#d84e55" strokeWidth={2} dot={{ r: 4 }} name="New Users" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No trend data available</p>
        )}
      </div>

      {/* Popular Routes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Popular Routes (Top 10)</h3>
        {topRoutes.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={Math.max(250, topRoutes.length * 40)}>
              <BarChart data={topRoutes} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey={(r: any) => `${r.origin_city} → ${r.destination_city}`}
                  tick={{ fontSize: 11 }}
                  width={150}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [value, name === 'bookings' ? 'Bookings' : name]}
                />
                <Bar dataKey="bookings" fill="#d84e55" radius={[0, 4, 4, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Route</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Bookings</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Revenue</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Avg Fare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topRoutes.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1 text-gray-800">
                          {r.origin_city} <ArrowRight className="h-3 w-3 text-gray-400" /> {r.destination_city}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">{r.bookings}</td>
                      <td className="px-4 py-2 text-right text-gray-600">NPR {r.revenue?.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-gray-600">NPR {r.avg_fare?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No route data available</p>
        )}
      </div>

      {/* Peak Hours */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Bookings by Hour of Day</h3>
          {peakHour && (
            <div className="flex items-center gap-2 bg-[#d84e55]/10 text-[#d84e55] px-4 py-2 rounded-lg">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-sm font-semibold">Peak Hour: {peakHour.hour}:00</span>
              <span className="text-sm">({peakHour.count} bookings)</span>
            </div>
          )}
        </div>
        {hourData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12 }}
                tickFormatter={(h: number) => `${h}:00`}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(h: any) => `Hour: ${h}:00`}
                formatter={(value: any) => [value, 'Bookings']}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No hourly data available</p>
        )}
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Conversion Funnel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Searches</p>
            <p className="text-3xl font-bold text-gray-800">{totalSearches.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Total searches</p>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-xl relative">
            <p className="text-sm text-gray-500 mb-1">Bookings</p>
            <p className="text-3xl font-bold text-gray-800">{totalBookingsCompleted.toLocaleString()}</p>
            <p className="text-xs text-[#d84e55] font-semibold mt-1">{searchToBooking}% conversion</p>
            <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 text-gray-300">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-xl relative">
            <p className="text-sm text-gray-500 mb-1">Completed Payments</p>
            <p className="text-3xl font-bold text-gray-800">{totalPaidPayments.toLocaleString()}</p>
            <p className="text-xs text-[#d84e55] font-semibold mt-1">{bookingToPayment}% conversion</p>
            <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 text-gray-300">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
