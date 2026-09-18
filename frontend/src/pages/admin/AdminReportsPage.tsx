import { useState, useEffect } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { reportAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

export default function AdminReportsPage() {
  const [activeReport, setActiveReport] = useState('bookings');
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
    { id: 'bookings', label: 'Bookings' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'operators', label: 'Operators' },
    { id: 'users', label: 'Users' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 className="h-6 w-6 text-blue-600" /> Reports</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {reports.map((r) => (
          <button key={r.id} onClick={() => setActiveReport(r.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeReport === r.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            {r.label}
          </button>
        ))}
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {activeReport === 'revenue' && data && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">NPR {data.total_revenue?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-green-600">{data.total_bookings || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Avg. Fare</p>
                  <p className="text-2xl font-bold text-purple-600">NPR {data.average_fare?.toLocaleString() || 0}</p>
                </div>
              </div>
              {data.revenue_by_operator?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Revenue by Operator</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Operator</th><th className="px-4 py-2 text-right">Bookings</th><th className="px-4 py-2 text-right">Revenue</th></tr></thead>
                    <tbody className="divide-y">
                      {data.revenue_by_operator.map((op: any, i: number) => (
                        <tr key={i}><td className="px-4 py-2">{op.company_name}</td><td className="px-4 py-2 text-right">{op.total_bookings}</td><td className="px-4 py-2 text-right">NPR {op.total_revenue?.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeReport === 'bookings' && data && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Total: {data.total_bookings || 0} bookings</p>
              {data.bookings?.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">PNR</th><th className="px-4 py-2 text-left">Passenger</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Date</th></tr></thead>
                  <tbody className="divide-y">
                    {data.bookings.map((b: any) => (
                      <tr key={b.id}><td className="px-4 py-2 font-mono">{b.pnr}</td><td className="px-4 py-2">{b.passenger_name}</td><td className="px-4 py-2 text-right">NPR {b.total_amount}</td><td className="px-4 py-2"><span className={`px-2 py-1 rounded text-xs ${b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{b.status}</span></td><td className="px-4 py-2">{b.trip_date}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeReport === 'operators' && data && (
            <div>
              {data.operators?.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Operator</th><th className="px-4 py-2 text-right">Buses</th><th className="px-4 py-2 text-right">Trips</th><th className="px-4 py-2 text-right">Bookings</th><th className="px-4 py-2 text-right">Revenue</th></tr></thead>
                  <tbody className="divide-y">
                    {data.operators.map((op: any, i: number) => (
                      <tr key={i}><td className="px-4 py-2">{op.company_name}</td><td className="px-4 py-2 text-right">{op.total_buses}</td><td className="px-4 py-2 text-right">{op.total_trips}</td><td className="px-4 py-2 text-right">{op.total_bookings}</td><td className="px-4 py-2 text-right">NPR {op.total_revenue?.toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeReport === 'users' && data && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Total Users: {data.total_users || 0}</p>
              {data.users?.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Phone</th><th className="px-4 py-2 text-left">Email</th><th className="px-4 py-2 text-left">Role</th><th className="px-4 py-2 text-right">Bookings</th></tr></thead>
                  <tbody className="divide-y">
                    {data.users.map((u: any) => (
                      <tr key={u.id}><td className="px-4 py-2">{u.full_name}</td><td className="px-4 py-2">{u.phone_number}</td><td className="px-4 py-2">{u.email || '-'}</td><td className="px-4 py-2">{u.role}</td><td className="px-4 py-2 text-right">{u.total_bookings}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {!data && <p className="text-center text-gray-500">No data available</p>}
        </div>
      )}
    </div>
  );
}
