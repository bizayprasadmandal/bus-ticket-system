import { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, ChevronLeft, ChevronRight, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  available_seats: number;
  status: string;
  current_fare: number | string;
  route?: { id?: number; origin_city?: string; destination_city?: string };
  bus?: {
    id?: number;
    bus_number?: string;
    bus_type?: string;
    operator?: { id?: number; company_name?: string };
  };
}

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const itemsPerPage = 10;

  const loadTrips = useCallback(async () => {
    try {
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      const res = await api.get('/admin/trips', { params });
      setTrips(res.data.data.items || []);
      setTotalItems(res.data.data.pagination?.total_items || 0);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, dateFrom, dateTo]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadTrips, 30000, true, false);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const resetPage = () => setCurrentPage(1);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-700';
      case 'BOARDING': return 'bg-yellow-100 text-yellow-700';
      case 'DEPARTED': return 'bg-purple-100 text-purple-700';
      case 'ARRIVED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={7} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Trips</h1>
          <p className="text-sm text-gray-500 mt-1">All trips across all operators</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by route, bus, or operator..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="BOARDING">Boarding</option>
            <option value="DEPARTED">Departed</option>
            <option value="ARRIVED">Arrived</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trip ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Bus</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Operator</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date & Time</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Available</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Fare</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-600">#{trip.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-800">
                      <MapPin className="h-3.5 w-3.5 text-[#d84e55]" />
                      <span className="font-medium">{trip.route?.origin_city || '—'}</span>
                      <ArrowRight className="h-3 w-3 text-gray-400 mx-1" />
                      <span className="font-medium">{trip.route?.destination_city || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{trip.bus?.bus_number || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{trip.bus?.operator?.company_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-gray-800">{trip.trip_date}</p>
                      <p className="text-xs text-gray-400">{trip.departure_time}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${trip.available_seats <= 5 ? 'text-[#d84e55]' : 'text-gray-800'}`}>
                      {trip.available_seats}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    NPR {Number(trip.current_fare || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                      {trip.status?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No trips found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((safePage - 1) * itemsPerPage) + 1} to {Math.min(safePage * itemsPerPage, totalItems)} of {totalItems}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  return Math.abs(page - safePage) <= 1;
                })
                .reduce<(number | '...')[]>((acc, page, i, arr) => {
                  if (i > 0 && page - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(page);
                  return acc;
                }, [])
                .map((page, i) =>
                  page === '...' ? (
                    <span key={`gap-${i}`} className="px-1 text-gray-400">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        safePage === page
                          ? 'bg-[#d84e55] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
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
