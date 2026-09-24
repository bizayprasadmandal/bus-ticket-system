import { useState, useEffect, useCallback } from 'react';
import { Bus, Search, ChevronLeft, ChevronRight, RefreshCw, Users } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface BusItem {
  id: number;
  bus_number: string;
  bus_model: string;
  bus_type: string;
  operator_name: string;
  total_seats: number;
  status: string;
  created_at: string | null;
}

interface BusStats {
  total: number;
  active: number;
  capacity: number;
}

export default function AdminBusesPage() {
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<BusStats>({ total: 0, active: 0, capacity: 0 });

  const itemsPerPage = 10;

  const loadBuses = useCallback(async () => {
    try {
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.bus_type = typeFilter;
      const res = await api.get('/admin/buses', { params });
      const items = res.data.data.items || [];
      const pagination = res.data.data.pagination || {};
      const apiStats = res.data.data.stats || {};
      setTotalPages(pagination.total_pages || 1);
      setTotalItems(pagination.total_items || 0);
      setStats({
        total: apiStats.total ?? pagination.total_items ?? 0,
        active: apiStats.active ?? 0,
        capacity: apiStats.capacity ?? 0,
      });
      setBuses(items.map((b: any) => ({
        id: b.id,
        bus_number: b.bus_number,
        bus_model: b.bus_model || '-',
        bus_type: b.bus_type,
        operator_name: b.operator?.company_name || '-',
        total_seats: b.total_seats || 0,
        status: b.status,
        created_at: b.registration_date || null,
      })));
    } catch {
      toast.error('Failed to load buses');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter, currentPage]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadBuses, 30000);

  useEffect(() => { loadBuses(); }, [loadBuses]);

  const paginatedBuses = buses;

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, typeFilter]);

  const getBusTypeColor = (type: string) => {
    switch (type) {
      case 'AC': return 'bg-blue-100 text-blue-700';
      case 'DELUXE': return 'bg-purple-100 text-purple-700';
      case 'SLEEPER': return 'bg-indigo-100 text-indigo-700';
      case 'VIP': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'RETIRED': return 'bg-gray-100 text-gray-600';
      case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Buses</h1>
          <p className="text-sm text-gray-500 mt-1">All buses registered by operators</p>
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
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Buses</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Capacity</p>
          <p className="text-2xl font-bold text-[#d84e55]">{stats.capacity}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by bus number, model, or operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Types</option>
            <option value="AC">AC</option>
            <option value="DELUXE">Deluxe</option>
            <option value="SUPER_DELUXE">Super Deluxe</option>
            <option value="SLEEPER">Sleeper</option>
            <option value="SEMI_SLEEPER">Semi Sleeper</option>
            <option value="NON_AC">Non AC</option>
            <option value="TOURIST">Tourist</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Bus Number</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Model</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Operator</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Seats</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedBuses.map((bus) => (
                <tr key={bus.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
                        <Bus className="h-4 w-4 text-[#d84e55]" />
                      </div>
                      <span className="font-medium text-gray-800">{bus.bus_number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{bus.bus_model}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getBusTypeColor(bus.bus_type)}`}>
                      {bus.bus_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{bus.operator_name}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 text-gray-600">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {bus.total_seats}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(bus.status)}`}>
                      {bus.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {bus.created_at ? new Date(bus.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {paginatedBuses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Bus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No buses found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, (currentPage - 1) * itemsPerPage + buses.length)} of {totalItems}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-[#d84e55] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
