import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Ticket, Calendar, MapPin, Users } from 'lucide-react';
import { bookingAPI } from '../../api';
import type { Booking } from '../../types';
import toast from 'react-hot-toast';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    bookingAPI.getAll()
      .then((res) => setBookings(res.data.data.bookings || res.data.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleExpand = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

  const statusStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      case 'COMPLETED': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const filtered = bookings.filter((b) => {
    if (filter === 'ALL') return true;
    return b.booking_status === filter;
  });

  const counts = {
    ALL: bookings.length,
    CONFIRMED: bookings.filter((b) => b.booking_status === 'CONFIRMED').length,
    PENDING: bookings.filter((b) => b.booking_status === 'PENDING').length,
    COMPLETED: bookings.filter((b) => b.booking_status === 'COMPLETED').length,
    CANCELLED: bookings.filter((b) => b.booking_status === 'CANCELLED').length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>My Bookings</h1>
        <p className="text-gray-500 mt-1">View and manage your trips</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {Object.entries(counts).map(([key, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              filter === key
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-primary-200 hover:text-primary-600'
            }`}
          >
            {key.charAt(0) + key.slice(1).toLowerCase()} ({count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Ticket className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No bookings found</h3>
          <p className="text-sm text-gray-400">Start by searching for a trip!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
              <div className="p-5 cursor-pointer" onClick={() => toggleExpand(booking.id)}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Ticket stub */}
                    <div className="w-14 h-14 bg-primary-50 rounded-xl flex flex-col items-center justify-center border border-primary-100">
                      <span className="text-[10px] text-primary-400 font-medium">PNR</span>
                      <span className="text-xs font-bold text-primary-700 font-mono">{booking.pnr}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusStyle(booking.booking_status)}`}>
                          {booking.booking_status}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusStyle(booking.payment_status)}`}>
                          {booking.payment_status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-800 font-bold">
                        <MapPin className="h-3.5 w-3.5 text-primary-500" />
                        {booking.trip?.route?.origin_city} → {booking.trip?.route?.destination_city}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {booking.trip?.trip_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {booking.total_passengers} pax
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">NPR {booking.total_amount}</p>
                    </div>
                    <div className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
                      {expandedId === booking.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === booking.id && booking.passengers && booking.passengers.length > 0 && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary-500" />
                    Passengers
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {booking.passengers.map((p) => (
                      <div key={p.id} className="bg-white rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-primary-50 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold border border-primary-100">
                            {p.seat_number}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{p.passenger_name}</p>
                            <p className="text-xs text-gray-500">{p.age} yrs &middot; {p.gender} &middot; {p.id_type}: {p.id_number}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
