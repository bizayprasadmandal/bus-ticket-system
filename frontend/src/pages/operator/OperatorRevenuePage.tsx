import { useState, useCallback } from 'react';
import { DollarSign, TrendingUp, Calendar, RefreshCw, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api, { operatorRevenueAPI } from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#d84e55', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

const nptFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' });
const THIRTY_DAYS = { start_date: nptFmt.format(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)), end_date: nptFmt.format(new Date()) };

export default function OperatorRevenuePage() {
  const [revenueData, setRevenueData] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [opAnalytics, setOpAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [revRes, bookRes, opRes] = await Promise.all([
        api.get('/reports/revenue', { params: THIRTY_DAYS }),
        api.get('/reports/bookings', { params: THIRTY_DAYS }),
        operatorRevenueAPI.get(),
      ]);
      setRevenueData(revRes.data.data);
      setBookingData(bookRes.data.data);
      setOpAnalytics(opRes.data.data);
    } catch {
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  const dailyRevenue = revenueData?.revenue_data?.map((d: any) => ({
    date: d.period,
    revenue: d.revenue,
  })) || [];

  const revenueByRoute = (opAnalytics?.revenue_by_route || []).map((r: any) => {
    const rt = r.trip?.route;
    return {
      route: rt ? (rt.route_name || `${rt.origin_city} → ${rt.destination_city}`) : 'Unknown',
      revenue: Number(r.revenue || 0),
    };
  });

  const bookingStatusData = (() => {
    const statusCounts: Record<string, number> = {};
    (bookingData?.bookings || []).forEach((b: any) => {
      const status = b.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-[#d84e55]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Revenue Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track your earnings and booking statistics (last 30 days)</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-[#d84e55]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-gray-800">NPR {Number(revenueData?.total_revenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Bookings</p>
              <p className="text-xl font-bold text-gray-800">{(revenueData?.total_bookings || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Service Fees</p>
              <p className="text-xl font-bold text-gray-800">NPR {Number(revenueData?.summary?.total_service_fee || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg per Trip</p>
              <p className="text-xl font-bold text-gray-800">NPR {Number(revenueData?.average_fare || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Revenue (Last 30 Days)</h3>
          {dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value: any) => `NPR ${Number(value ?? 0).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#d84e55" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No daily revenue data</div>
          )}
        </div>

        {/* Revenue by Route Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Route (Last 30 Days)</h3>
          {revenueByRoute.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByRoute}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="route" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(value: any) => `NPR ${Number(value ?? 0).toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#d84e55" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No route revenue data</div>
          )}
        </div>
      </div>

      {/* Bookings by Status Pie Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Bookings by Status</h3>
        {bookingStatusData.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={bookingStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {bookingStatusData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center">
              {bookingStatusData.map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="text-sm text-gray-600">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">No booking status data</div>
        )}
      </div>
    </div>
  );
}
