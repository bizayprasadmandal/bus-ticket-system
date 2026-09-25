import { useState, useEffect, useCallback } from 'react';
import { Ticket, Search, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import ServerPagination from '../../components/ServerPagination';
import toast from 'react-hot-toast';
import { bookingStatusLabel, paymentStatusLabel } from '../../utils/statusLabels';

interface BookingItem {
  id: number;
  pnr: string;
  passenger_name: string;
  passenger_phone: string;
  origin_city: string;
  destination_city: string;
  trip_date: string;
  total_passengers: number;
  total_amount: number;
  booking_status: string;
  payment_status: string;
  created_at: string;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const itemsPerPage = 10;

  const loadBookings = useCallback(async () => {
    try {
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'ALL') params.booking_status = statusFilter;
      if (paymentFilter !== 'ALL') params.payment_status = paymentFilter;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      const res = await api.get('/admin/bookings', { params });
      const items = res.data.data.items || [];
      const pagination = res.data.data.pagination || {};
      setTotalPages(pagination.total_pages || 1);
      setTotalItems(pagination.total_items || items.length);
      setBookings(items.map((b: any) => ({
        id: b.id,
        pnr: b.pnr,
        passenger_name: b.user?.full_name || 'N/A',
        passenger_phone: b.user?.phone_number || '',
        origin_city: b.trip?.route?.origin_city || '-',
        destination_city: b.trip?.route?.destination_city || '-',
        trip_date: b.trip?.trip_date || '',
        total_passengers: b.total_passengers || 0,
        total_amount: Number(b.total_amount) || 0,
        booking_status: b.booking_status,
        payment_status: b.payment_status,
        created_at: b.booking_date || b.created_at,
      })));
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, paymentFilter, dateFrom, dateTo, currentPage]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadBookings, 30000, true, false);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const resetPage = () => setCurrentPage(1);

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      case 'COMPLETED': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'REFUNDED': return 'bg-purple-100 text-purple-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={7} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Global list of all bookings across operators</p>
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
              placeholder="Search by PNR or name..."
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
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Awaiting Payment</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); resetPage(); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Payments</option>
            <option value="COMPLETED">Paid</option>
            <option value="PENDING">Awaiting Payment</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trip Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Passengers</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Payment</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[#d84e55] font-medium">{booking.pnr}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{booking.passenger_name}</p>
                      <p className="text-xs text-gray-400">{booking.passenger_phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <span>{booking.origin_city}</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span>{booking.destination_city}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{booking.trip_date}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{booking.total_passengers}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">NPR {booking.total_amount?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getBookingStatusColor(booking.booking_status)}`}>
                      {bookingStatusLabel(booking.booking_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
                      {paymentStatusLabel(booking.payment_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No bookings found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ServerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
