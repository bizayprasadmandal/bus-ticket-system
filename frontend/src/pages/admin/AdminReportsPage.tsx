import { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, Users, Bus, Ticket, DollarSign, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { reportAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const [activeReport, setActiveReport] = useState('revenue');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { loadReport(); }, [activeReport, dateFrom, dateTo]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      let res;
      switch (activeReport) {
        case 'bookings': res = await reportAPI.getBookings(params); break;
        case 'revenue': res = await reportAPI.getRevenue(params); break;
        case 'operators': res = await reportAPI.getOperators(params); break;
        case 'users': res = await reportAPI.getUsers(params); break;
        default: return;
      }
      setData(res.data.data);
    } catch { toast.error('Failed to load report'); } finally { setLoading(false); }
  };

  const reports = [
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'bookings', label: 'Bookings', icon: Ticket },
    { id: 'operators', label: 'Operators', icon: Bus },
    { id: 'users', label: 'Users', icon: Users },
  ];

  const exportToCSV = (csvData: any[], filename: string) => {
    if (!csvData || csvData.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
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
    switch (activeReport) {
      case 'revenue':
        exportToCSV(data?.revenue_by_operator || [], 'revenue_by_operator');
        break;
      case 'bookings':
        exportToCSV(data?.bookings || [], 'bookings_report');
        break;
      case 'operators':
        exportToCSV(data?.operators || [], 'operators_report');
        break;
      case 'users':
        exportToCSV(data?.users || [], 'users_report');
        break;
    }
  };

  const getBarWidth = (value: number, max: number) => {
    if (max === 0) return '0%';
    return `${(value / max) * 100}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" /> Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">Analyze bookings, revenue, and user activity</p>
        </div>
        <button
          onClick={handleExport}
          disabled={!data}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Report Tabs and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {reports.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveReport(r.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeReport === r.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {r.label}
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
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="From"
              />
            </div>
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
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
          {/* Revenue Report */}
          {activeReport === 'revenue' && data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-600" />
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
                      <TrendingUp className="h-5 w-5 text-purple-600" />
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
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.revenue_by_operator}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="company_name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total_revenue" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="total_bookings" stroke="#d84e55" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {data.revenue_by_operator?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Operator</h3>
                  <div className="space-y-4">
                    {data.revenue_by_operator.map((op: any, i: number) => {
                      const maxRevenue = Math.max(...data.revenue_by_operator.map((o: any) => o.total_revenue || 0));
                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">{op.company_name}</span>
                            <span className="text-sm text-gray-500">NPR {(op.total_revenue || 0).toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: getBarWidth(op.total_revenue || 0, maxRevenue) }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{op.total_bookings} bookings</span>
                            <span>{op.percentage || 0}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Bookings Report */}
          {activeReport === 'bookings' && data && (
            <>
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-800">{(data.total_bookings || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {data.bookings?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Bookings Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.bookings}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#d84e55" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {data.bookings?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Passenger</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.bookings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-blue-600 font-medium">{b.pnr}</td>
                            <td className="px-4 py-3 text-gray-800">{b.passenger_name}</td>
                            <td className="px-4 py-3 text-gray-600">{b.passenger_phone}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-800">NPR {b.total_amount?.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{b.trip_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Operators Report */}
          {activeReport === 'operators' && data && (
            <>
              {data.operators?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Operator</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">Buses</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">Trips</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">Bookings</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.operators.map((op: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Bus className="h-4 w-4 text-blue-600" />
                                </div>
                                <span className="font-medium text-gray-800">{op.company_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">{op.total_buses}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{op.total_trips}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-800">{op.total_bookings}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">NPR {(op.total_revenue || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Users Report */}
          {activeReport === 'users' && data && (
            <>
              <div className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold text-gray-800">{(data.total_users || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {data.users?.length > 0 && (() => {
                const roleCounts: Record<string, number> = {};
                data.users.forEach((u: any) => {
                  const role = u.role || 'UNKNOWN';
                  roleCounts[role] = (roleCounts[role] || 0) + 1;
                });
                const pieData = Object.entries(roleCounts).map(([name, value]) => ({ name, value }));
                const PIE_COLORS = ['#d84e55', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
                if (pieData.length > 0) {
                  return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">User Role Distribution</h3>
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {pieData.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-3 justify-center">
                          {pieData.map((entry: any, index: number) => (
                            <div key={entry.name} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                              <span className="text-sm text-gray-600">{entry.name}: {entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {data.users?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">Bookings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.users.map((u: any) => (
                          <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-medium text-xs">
                                    {u.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                                <span className="font-medium text-gray-800">{u.full_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{u.phone_number}</td>
                            <td className="px-4 py-3 text-gray-600">{u.email || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                u.role === 'OPERATOR' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {u.role?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-800">{u.total_bookings}</td>
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