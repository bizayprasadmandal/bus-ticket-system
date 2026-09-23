import { useState, useEffect, useCallback } from 'react';
import { Ticket, Search, ChevronLeft, ChevronRight, MapPin, Calendar, Phone, Users, RefreshCw, X, Printer, Clock, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface BookingItem {
  id: number;
  pnr: string;
  passenger_name: string;
  passenger_phone: string;
  total_passengers: number;
  total_amount: number;
  booking_status: string;
  booking_date: string;
  trip?: {
    trip_date: string;
    departure_time: string;
    route?: { origin_city: string; destination_city: string };
    bus?: { bus_number: string; bus_type: string };
  };
  passengers?: { passenger_name: string; seat_number: string; age: number; gender: string }[];
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
}

interface BookingStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  totalRevenue: number;
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-red-50 text-[#d84e55]',
  CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

const sanitize = (str: string) => String(str || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export default function CounterAgentBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<BookingStats | null>(null);

  const itemsPerPage = 10;

  const loadBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      if (searchQuery) params.set('search', searchQuery);
      const res = await api.get(`/bookings/counter/my-bookings?${params.toString()}`);
      setBookings(res.data.data.items || []);
      setPagination(res.data.data.pagination || null);
      setStats(res.data.data.stats || null);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadBookings, 30000);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const displayBookings = statusFilter === 'ALL' ? bookings : bookings.filter(b => b.booking_status === statusFilter);

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  const handleCancelBooking = async (id: number) => {
    setCancellingId(id);
    try {
      await api.post(`/bookings/${id}/cancel`, { cancellation_reason: 'Counter agent cancellation' });
      toast.success('Booking cancelled successfully');
      setConfirmCancelId(null);
      refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const handlePrintBooking = (booking: BookingItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const passengerRows = booking.passengers
      ?.map(
        (p, i) =>
          `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${i + 1}</td><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(p.passenger_name)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(p.seat_number)}</td></tr>`
      )
      .join('') || '';
    printWindow.document.write(`
      <html><head><title>Booking - ${sanitize(booking.pnr)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .ticket { max-width: 400px; margin: 0 auto; border: 2px solid #d84e55; padding: 16px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px dashed #d84e55; padding-bottom: 12px; margin-bottom: 12px; }
        .header h1 { margin: 0; color: #d84e55; font-size: 22px; }
        .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .info-row span:first-child { color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
        th { background: #f3f4f6; padding: 4px 8px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
        .total { text-align: right; font-size: 18px; font-weight: bold; color: #d84e55; margin-top: 8px; border-top: 2px solid #d84e55; padding-top: 8px; }
        .stamp { text-align: center; margin: 12px 0; }
        .stamp span { display: inline-block; border: 3px solid ${booking.payment_status === 'PAID' ? '#16a34a' : '#f59e0b'}; color: ${booking.payment_status === 'PAID' ? '#16a34a' : '#f59e0b'}; font-size: 16px; font-weight: bold; padding: 4px 16px; border-radius: 4px; transform: rotate(-5deg); }
      </style></head><body>
      <div class="ticket">
        <div class="header"><h1>Gadi Yatra</h1></div>
        <div class="info-row"><span>PNR</span><strong>${sanitize(booking.pnr)}</strong></div>
        <div class="info-row"><span>Route</span><strong>${sanitize(booking.trip?.route?.origin_city)} → ${sanitize(booking.trip?.route?.destination_city)}</strong></div>
        <div class="info-row"><span>Date</span><strong>${sanitize(booking.trip?.trip_date)}</strong></div>
        <div class="info-row"><span>Time</span><strong>${sanitize(booking.trip?.departure_time)}</strong></div>
        <div class="info-row"><span>Bus</span><strong>${sanitize(booking.trip?.bus?.bus_type)} (${sanitize(booking.trip?.bus?.bus_number)})</strong></div>
        <table><thead><tr><th>#</th><th>Passenger</th><th>Seat</th></tr></thead><tbody>${passengerRows}</tbody></table>
        <div class="total">Total: NPR ${booking.total_amount.toLocaleString()}</div>
        <div class="stamp"><span>${booking.payment_status === 'PAID' ? 'PAID - CASH' : sanitize(booking.booking_status)}</span></div>
      </div>
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Counter Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">All bookings made at the counter today</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors btn-press"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 animate-stagger-in stagger-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-[#d84e55]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 animate-stagger-in stagger-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 animate-stagger-in stagger-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-[#d84e55]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 animate-stagger-in stagger-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-[#d84e55]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold text-[#d84e55]">NPR {stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by PNR, passenger name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Passenger</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trip Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Passengers</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                        <Ticket className="h-4 w-4 text-[#d84e55]" />
                      </div>
                      <span className="font-mono font-medium text-[#d84e55]">{booking.pnr}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{booking.passenger_name || 'Customer'}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="h-3 w-3" />
                        {booking.passenger_phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-600 font-medium">{booking.trip?.route?.origin_city}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-red-600 font-medium">{booking.trip?.route?.destination_city}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {booking.trip?.trip_date}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {booking.total_passengers}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">NPR {booking.total_amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[booking.booking_status] || 'bg-gray-100 text-gray-600'}`}>
                      {booking.booking_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handlePrintBooking(booking)}
                        className="p-1.5 text-gray-400 hover:text-[#d84e55] hover:bg-red-50 rounded-lg transition-colors"
                        title="Print Ticket"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="p-1.5 text-gray-400 hover:text-[#d84e55] hover:bg-red-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                      {booking.booking_status === 'CONFIRMED' && (
                        confirmCancelId === booking.id ? (
                          <div className="flex items-center gap-1 ml-1">
                            <span className="text-xs text-red-600 font-medium">Cancel?</span>
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              disabled={cancellingId === booking.id}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 btn-press"
                            >
                              {cancellingId === booking.id ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmCancelId(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 btn-press"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmCancelId(booking.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors btn-press"
                            title="Cancel Booking"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayBookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No bookings found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((pagination.current_page - 1) * pagination.items_per_page) + 1} to {Math.min(pagination.current_page * pagination.items_per_page, pagination.total_items)} of {pagination.total_items}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                const start = Math.max(1, Math.min(pagination.current_page - 2, pagination.total_pages - 4));
                const page = start + i;
                if (page > pagination.total_pages) return null;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-[#d84e55] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={currentPage === pagination.total_pages}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Booking Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">PNR Number</p>
                  <p className="text-xl font-mono font-bold text-[#d84e55]">{selectedBooking.pnr}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedBooking.booking_status] || 'bg-gray-100 text-gray-600'}`}>
                  {selectedBooking.booking_status}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Passenger</p>
                <p className="font-medium text-gray-800">{selectedBooking.passenger_name || 'Customer'}</p>
                <p className="text-sm text-gray-600">{selectedBooking.passenger_phone}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Trip Details</p>
                <div className="flex items-center gap-2 text-gray-800">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{selectedBooking.trip?.route?.origin_city}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium">{selectedBooking.trip?.route?.destination_city}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {selectedBooking.trip?.trip_date}
                  </span>
                  <span>{selectedBooking.trip?.departure_time}</span>
                </div>
              </div>

              {selectedBooking.passengers && selectedBooking.passengers.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">Passengers ({selectedBooking.total_passengers})</p>
                  <div className="space-y-2">
                    {selectedBooking.passengers.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-800">{p.passenger_name}</span>
                        <span className="text-gray-500">Seat {p.seat_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-[#d84e55]">NPR {selectedBooking.total_amount.toLocaleString()}</p>
                </div>
              </div>

              <p className="text-xs text-gray-400">Booked on {new Date(selectedBooking.booking_date).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
