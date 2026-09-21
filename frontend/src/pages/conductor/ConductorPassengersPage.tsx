import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Ticket, MapPin, Phone, Users, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { operatorBookingAPI } from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

interface PassengerDetail {
  name: string;
  seat_number: string;
  phone?: string;
}

interface BookingItem {
  id: number;
  pnr: string;
  total_passengers: number;
  total_amount: number;
  booking_status: string;
  boarded?: boolean;
  trip?: {
    trip_date: string;
    departure_time: string;
    route?: { origin_city: string; destination_city: string };
    bus?: { bus_number: string; bus_type: string };
  };
  user?: { full_name: string; phone_number: string };
  passengers?: PassengerDetail[];
}

export default function ConductorPassengersPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [boardedMap, setBoardedMap] = useState<Record<number, boolean>>({});

  const loadBookings = useCallback(async () => {
    try {
      const res = await operatorBookingAPI.getMyBookings();
      setBookings(res.data.data.bookings || []);
    } catch {
      toast.error('Failed to load passengers');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadBookings, 30000);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const query = searchQuery.toLowerCase();
    return bookings.filter((booking) => {
      const matchesPNR = booking.pnr?.toLowerCase().includes(query);
      const matchesPassenger = booking.passengers?.some(p => p.name?.toLowerCase().includes(query));
      const matchesUser = booking.user?.full_name?.toLowerCase().includes(query);
      return matchesPNR || matchesPassenger || matchesUser;
    });
  }, [bookings, searchQuery]);

  const handleMarkBoarded = (bookingId: number) => {
    setBoardedMap(prev => ({ ...prev, [bookingId]: !prev[bookingId] }));
    toast.success(boardedMap[bookingId] ? 'Marked as not boarded' : 'Passenger boarded');
  };

  const statusColors: Record<string, string> = {
    CONFIRMED: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    CANCELLED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Passengers</h1>
          <p className="text-sm text-gray-500 mt-1">Search passengers by PNR or name</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by PNR or passenger name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-800">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">{bookings.filter(b => b.booking_status === 'CONFIRMED').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Passengers</p>
          <p className="text-2xl font-bold text-purple-600">{bookings.reduce((sum, b) => sum + b.total_passengers, 0)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery ? 'No passengers match your search' : 'No bookings found'}
            </p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const isBoarded = boardedMap[booking.id] || false;
            return (
              <div
                key={booking.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                  isBoarded ? 'border-green-200 bg-green-50/30' : 'border-gray-100'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isBoarded ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        {isBoarded ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Ticket className="h-6 w-6 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-600">{booking.pnr}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.booking_status] || 'bg-gray-100 text-gray-600'}`}>
                            {booking.booking_status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                          <Users className="h-3.5 w-3.5" />
                          <span>{booking.user?.full_name || 'Customer'}</span>
                          <span className="text-gray-400">|</span>
                          <Phone className="h-3.5 w-3.5" />
                          <span>{booking.user?.phone_number}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkBoarded(booking.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isBoarded
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {isBoarded ? 'Boarded' : 'Mark Boarded'}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-green-600" />
                      <span className="font-medium">{booking.trip?.route?.origin_city}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium">{booking.trip?.route?.destination_city}</span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <span>{booking.trip?.trip_date} {booking.trip?.departure_time}</span>
                    <span className="text-gray-300">|</span>
                    <span>{booking.trip?.bus?.bus_number}</span>
                    <span className="text-gray-300">|</span>
                    <span className="font-medium text-green-600">NPR {booking.total_amount.toLocaleString()}</span>
                  </div>

                  {booking.passengers && booking.passengers.length > 0 && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-2">Passengers ({booking.passengers.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {booking.passengers.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-gray-100 text-sm">
                            <span className="font-medium text-gray-800">{p.name}</span>
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              Seat {p.seat_number}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
