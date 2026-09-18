import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Ticket } from 'lucide-react';
import { bookingAPI } from '../../api';
import type { Booking } from '../../types';
import toast from 'react-hot-toast';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    bookingAPI.getAll()
      .then((res) => setBookings(res.data.data.bookings || res.data.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return <div className="text-center py-16 text-gray-500">Loading bookings...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Bookings</h1>
        <p className="text-gray-500 mt-1">View and manage your trips</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Ticket className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No bookings yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleExpand(booking.id)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-500">PNR: {booking.pnr}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(booking.booking_status)}`}>
                        {booking.booking_status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(booking.payment_status)}`}>
                        {booking.payment_status}
                      </span>
                    </div>
                    <p className="font-medium text-gray-800 mt-1">
                      {booking.trip?.route?.origin_city} &rarr; {booking.trip?.route?.destination_city}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {booking.trip?.trip_date} &middot; {booking.total_passengers} passenger{booking.total_passengers !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-blue-600">Rs. {booking.total_amount}</span>
                    {expandedId === booking.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>
              </div>

              {expandedId === booking.id && booking.passengers && booking.passengers.length > 0 && (
                <div className="border-t px-5 py-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Passengers</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="pb-2">Name</th>
                          <th className="pb-2">Age</th>
                          <th className="pb-2">Gender</th>
                          <th className="pb-2">Seat</th>
                          <th className="pb-2">ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {booking.passengers.map((p) => (
                          <tr key={p.id} className="border-t border-gray-200">
                            <td className="py-2 font-medium">{p.passenger_name}</td>
                            <td className="py-2">{p.age}</td>
                            <td className="py-2 capitalize">{p.gender}</td>
                            <td className="py-2 font-mono">{p.seat_number}</td>
                            <td className="py-2">{p.id_type}: {p.id_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
