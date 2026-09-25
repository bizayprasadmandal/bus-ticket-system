import { useState, useEffect } from 'react';
import { TrendingUp, Users, Bus, Ticket, DollarSign, ArrowUpRight, ArrowRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminAnalyticsAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface SummaryData {
  new_users_this_month: number;
  new_operators: number;
  bookings_growth: number;
  revenue_growth: number;
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
  const [totalBookingsCompleted, setTotalBookingsCompleted] = useState(0);
  const [totalPaidPayments, setTotalPaidPayments] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await adminAnalyticsAPI.get();
      const d = res.data.data || {};

      const growth = d.growth || {};
      setSummary({
        new_users_this_month: growth.users_this_month ?? 0,
        new_operators: growth.operators_this_month ?? 0,
        bookings_growth: growth.bookings_growth_pct ?? 0,
        revenue_growth: growth.revenue_growth_pct ?? 0,
      });

      setDailyTrends((d.daily_new_users || []).map((r: any) => ({
        date: String(r.date || '').slice(0, 10),
        count: Number(r.count) || 0,
      })));

      setRouteData((d.popular_routes || []).map((r: any) => ({
        origin_city: r.origin || 'Unknown',
        destination_city: r.destination || 'Unknown',
        bookings: Number(r.bookings) || 0,
        revenue: Number(r.revenue) || 0,
        avg_fare: Number(r.bookings) > 0 ? Math.round(Number(r.revenue) / Number(r.bookings)) : 0,
      })));

      const peakMap = new Map<number, number>();
      for (let h = 0; h < 24; h++) peakMap.set(h, 0);
      for (const r of d.peak_hours || []) {
        peakMap.set(Number(r.hour), Number(r.count) || 0);
      }
      setHourData(Array.from(peakMap.entries()).map(([hour, count]) => ({ hour, count })));

      setTotalBookingsCompleted(Number(d.conversion?.bookings) || 0);
      setTotalPaidPayments(Number(d.conversion?.completed_payments) || 0);
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
          <h3 className="text-lg font-semibold text-gray-800">Bookings by Hour of Day (Last 30 Days)</h3>
          {peakHour && peakHour.count > 0 && (
            <div className="flex items-center gap-2 bg-[#d84e55]/10 text-[#d84e55] px-4 py-2 rounded-lg">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-sm font-semibold">Peak Hour: {peakHour.hour}:00</span>
              <span className="text-sm">({peakHour.count} bookings)</span>
            </div>
          )}
        </div>
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
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Conversion Funnel</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-6 bg-gray-50 rounded-xl relative">
            <p className="text-sm text-gray-500 mb-1">Total Bookings</p>
            <p className="text-3xl font-bold text-gray-800">{totalBookingsCompleted.toLocaleString()}</p>
            <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 text-gray-300">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-xl relative">
            <p className="text-sm text-gray-500 mb-1">Completed Payments</p>
            <p className="text-3xl font-bold text-gray-800">{totalPaidPayments.toLocaleString()}</p>
            <p className="text-xs text-[#d84e55] font-semibold mt-1">{bookingToPayment}% conversion</p>
          </div>
        </div>
      </div>
    </div>
  );
}
