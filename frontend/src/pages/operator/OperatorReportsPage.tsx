import { useState, useEffect } from 'react';
import { BarChart3, Download, Ticket, DollarSign, Bus, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

export default function OperatorReportsPage() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadReport();
  }, [activeTab, dateFrom, dateTo]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      let res;
      switch (activeTab) {
        case 'bookings':
          res = await api.get('/reports/bookings', { params });
          break;
        case 'revenue':
          res = await api.get('/reports/revenue', { params });
          break;
        case 'trips':
          res = await api.get('/trips/operator/my-trips', { params });
          break;
        default:
          setData(null);
          return;
      }
      setData(res.data.data);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'bookings', label: 'Bookings', icon: Ticket },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'trips', label: 'Trips', icon: Bus },
  ];

  const exportToCSV = (csvData: any[], filename: string) => {
    if (!csvData || csvData.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map((row) =>
        headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Exported successfully');
  };

  const handleExport = () => {
    switch (activeTab) {
      case 'bookings':
        exportToCSV(data?.bookings || [], 'operator_bookings_report');
        break;
      case 'revenue':
        exportToCSV(data?.revenue_by_operator || [], 'operator_revenue_report');
        break;
      case 'trips':
        exportToCSV(data?.trips || data || [], 'operator_trips_report');
        break;
    }
  };

  const bookingTrend = (() => {
    const byDate: Record<string, { date: string; bookings: number; revenue: number }> = {};
    (data?.bookings || []).forEach((b: any) => {
      const key = String(b.booking_date || '').slice(0, 10);
      if (!key) return;
      if (!byDate[key]) byDate[key] = { date: key, bookings: 0, revenue: 0 };
      byDate[key].bookings += 1;
      byDate[key].revenue += Number(b.total_amount || 0);
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#d84e55]" /> Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">Export and analyze your bookings, revenue, and trips</p>
        </div>
        <button
          onClick={handleExport}
          disabled={!data}
          className="flex items-center gap-2 bg-[#d84e55] text-white px-4 py-2 rounded-lg hover:bg-[#c4434a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Tabs and Date Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#d84e55] text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
              />
            </div>
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : (
        <div className="space-y-6">
          {/* Bookings Report */}
          {activeTab === 'bookings' && data && (
            <>
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-[#d84e55]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-800">{(data.total_bookings || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {bookingTrend.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Bookings Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={bookingTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#d84e55" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {bookingTrend.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">Bookings</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {bookingTrend.map((b, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-800">{b.date}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-800">{b.bookings}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
                              NPR {(b.revenue || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Revenue Report */}
          {activeTab === 'revenue' && data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-[#d84e55]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-800">NPR {(data.total_revenue || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Bookings</p>
                      <p className="text-2xl font-bold text-gray-800">{(data.total_bookings || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg. Fare</p>
                      <p className="text-2xl font-bold text-gray-800">NPR {(data.average_fare || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {data.revenue_by_operator?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Operator</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.revenue_by_operator}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="company_name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `NPR ${Number(value ?? 0).toLocaleString()}`} />
                      <Bar dataKey="total_revenue" fill="#d84e55" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* Trips Report */}
          {activeTab === 'trips' && data && (
            <>
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
                    <Bus className="h-5 w-5 text-[#d84e55]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Trips</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {(data.trips?.length || data.length || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {(data.trips || data).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Bus</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Departure</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">Seats</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(data.trips || data).map((trip: any) => (
                          <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-800">{trip.trip_date}</td>
                            <td className="px-4 py-3">
                              <span className="text-green-600">{trip.route?.origin_city}</span>
                              <span className="text-gray-400 mx-1">→</span>
                              <span className="text-red-600">{trip.route?.destination_city}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{trip.bus?.bus_number}</td>
                            <td className="px-4 py-3 text-gray-600">{trip.departure_time}</td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {trip.available_seats ?? '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                trip.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                                trip.status === 'ARRIVED' ? 'bg-green-100 text-green-700' :
                                trip.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {trip.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {!data && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No data available for the selected filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
