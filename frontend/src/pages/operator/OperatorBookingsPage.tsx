import { useState, useEffect, useCallback } from 'react';
import { Ticket, Search, MapPin, Calendar, Phone, Users, RefreshCw } from 'lucide-react';
import { operatorBookingAPI } from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import ServerPagination from '../../components/ServerPagination';
import toast from 'react-hot-toast';
import { bookingStatusLabel } from '../../utils/statusLabels';

interface BookingItem {
  id: number;
  pnr: string;
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
  user?: { full_name: string; phone_number: string };
  passengers?: { passenger_name: string; seat_number: string }[];
}

interface Summary {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  revenue: number;
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  NO_SHOW: 'bg-gray-200 text-gray-700',
};

const ITEMS_PER_PAGE = 10;

export default function OperatorBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<Summary>({ total: 0, confirmed: 0, pending: 0, cancelled: 0, revenue: 0 });
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      const res = await operatorBookingAPI.getMyBookings({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchQuery || undefined,
        booking_status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      const data = res.data.data || {};
      const rows: BookingItem[] = data.bookings || [];
      setBookings(rows);
      if (data.pagination) {
        setTotalPages(data.pagination.total_pages || 1);
        setTotalItems(data.pagination.total_items ?? rows.length);
      } else {
        setTotalPages(1);
        setTotalItems(rows.length);
      }
      if (data.summary) {
        setSummary(data.summary);
      } else {
        setSummary({
          total: rows.length,
          confirmed: rows.filter(b => b.booking_status === 'CONFIRMED').length,
          pending: rows.filter(b => b.booking_status === 'PENDING').length,
          cancelled: rows.filter(b => b.booking_status === 'CANCELLED').length,
          revenue: rows.filter(b => ['CONFIRMED', 'COMPLETED'].includes(b.booking_status)).reduce((sum, b) => sum + Number(b.total_amount || 0), 0),
        });
      }
    } catch { toast.error('Failed to load bookings'); } finally { setLoading(false); }
  }, [currentPage, searchQuery, statusFilter]);

  useEffect(() => { loadBookings(); }, [loadBookings]);
  // Debounce server-side search so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadBookings, 30000, true, false);

  const resetPage = () => setCurrentPage(1);

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all bookings for your trips</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-800">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">{summary.confirmed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Awaiting Payment</p>
          <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Cancelled</p>
          <p className="text-2xl font-bold text-red-600">{summary.cancelled}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-2xl font-bold text-blue-600">NPR {summary.revenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by PNR, passenger, phone, or route..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); resetPage(); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Awaiting Payment</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
            <option value="NO_SHOW">No Show</option>
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
                <th className="px-4 py-3 text-right font-medium text-gray-600">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Ticket className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-mono font-medium text-blue-600">{booking.pnr}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{booking.user?.full_name || 'Customer'}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="h-3 w-3" />
                        {booking.user?.phone_number}
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
                  <td className="px-4 py-3 font-medium text-gray-800">NPR {Number(booking.total_amount ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[booking.booking_status] || 'bg-gray-100 text-gray-600'}`}>
                      {bookingStatusLabel(booking.booking_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mx-auto block"
                      title="View Details"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
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

        <ServerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Booking Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* PNR and Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">PNR Number</p>
                  <p className="text-xl font-mono font-bold text-blue-600">{selectedBooking.pnr}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedBooking.booking_status] || 'bg-gray-100 text-gray-600'}`}>
                  {bookingStatusLabel(selectedBooking.booking_status)}
                </span>
              </div>

              {/* Passenger Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Passenger</p>
                <p className="font-medium text-gray-800">{selectedBooking.user?.full_name || 'Customer'}</p>
                <p className="text-sm text-gray-600">{selectedBooking.user?.phone_number}</p>
              </div>

              {/* Trip Info */}
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

              {/* Passengers */}
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

              {/* Amount */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-green-600">NPR {Number(selectedBooking.total_amount ?? 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Booked On */}
              <p className="text-xs text-gray-400">Booked on {new Date(selectedBooking.booking_date).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
