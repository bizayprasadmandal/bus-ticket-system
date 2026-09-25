import { useState, useEffect, useMemo } from 'react';
import { Bus, Search, RefreshCw, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';
import { useAuthStore } from '../../store/authStore';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';

interface BusItem {
  id: number;
  bus_number: string;
  bus_model: string | null;
  bus_type: string;
  total_seats: number;
  status: string;
}

export default function DispatcherBusesPage() {
  const user = useAuthStore((s) => s.user);
  const operatorId = user?.roles?.find(
    (r) => (r.role === 'DISPATCHER' || r.role === 'OPERATOR') && r.is_active
  )?.operator_id;

  const [buses, setBuses] = useState<BusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const fetchBuses = async (initial = false) => {
    try {
      if (initial) setLoading(true);
      const params: Record<string, any> = { status: statusFilter };
      if (operatorId) params.operator_id = operatorId;
      const res = await api.get('/buses', { params });
      setBuses(res.data.data?.buses || []);
    } catch {
      setBuses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBuses(true); }, [statusFilter, operatorId]);
  useAutoRefresh(fetchBuses, 30000, true, false);

  const filtered = useMemo(() => {
    return buses.filter(b => {
      const model = (b.bus_model || '').toLowerCase();
      const matchSearch = !searchQuery
        || b.bus_number.toLowerCase().includes(searchQuery.toLowerCase())
        || model.includes(searchQuery.toLowerCase());
      const matchType = typeFilter === 'ALL' || b.bus_type === typeFilter;
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [buses, searchQuery, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Buses</h1>
          <p className="text-sm text-gray-500 mt-1">View buses assigned to your operator</p>
        </div>
        <button onClick={() => fetchBuses(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Bus className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{buses.length}</p><p className="text-xs text-gray-500">Total Buses</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><Bus className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{buses.filter(b => b.status === 'ACTIVE').length}</p><p className="text-xs text-gray-500">Active</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><Users className="h-5 w-5 text-purple-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{buses.reduce((s, b) => s + (b.total_seats || 0), 0)}</p><p className="text-xs text-gray-500">Total Seats</p></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search by number or model..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 border rounded-lg text-sm outline-none bg-white">
            <option value="ALL">All Types</option>
            <option value="AC">AC</option>
            <option value="NON_AC">Non-AC</option>
            <option value="DELUXE">Deluxe</option>
            <option value="SUPER_DELUXE">Super Deluxe</option>
            <option value="SLEEPER">Sleeper</option>
            <option value="SEMI_SLEEPER">Semi Sleeper</option>
            <option value="TOURIST">Tourist</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 border rounded-lg text-sm outline-none bg-white">
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>

        {loading ? <TableSkeleton rows={5} cols={5} /> : paginated.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><Bus className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p>No buses found</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b">
                    <th className="pb-3 px-4">Bus Number</th>
                    <th className="pb-3 px-4">Model</th>
                    <th className="pb-3 px-4">Type</th>
                    <th className="pb-3 px-4">Seats</th>
                    <th className="pb-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(bus => (
                    <tr key={bus.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                      <td className="py-3 px-4"><span className="font-medium text-gray-800">{bus.bus_number}</span></td>
                      <td className="py-3 px-4 text-sm text-gray-600">{bus.bus_model || '-'}</td>
                      <td className="py-3 px-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{bus.bus_type}</span></td>
                      <td className="py-3 px-4 text-sm text-gray-600">{bus.total_seats}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${bus.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : bus.status === 'MAINTENANCE' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                          {bus.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-500">Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="h-4 w-4" /></button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                    const page = start + i;
                    if (page > totalPages) return null;
                    return (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-[#d84e55] text-white' : 'text-gray-600 hover:bg-gray-100 border'}`}>
                        {page}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
