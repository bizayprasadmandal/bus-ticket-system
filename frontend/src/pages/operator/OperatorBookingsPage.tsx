import { useState, useEffect } from 'react';
import { Ticket } from 'lucide-react';
import { operatorBookingAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface BookingItem {
  id: number;
  pnr: string;
  total_passengers: number;
  total_amount: number;
  status: string;
  created_at: string;
  trip?: { trip_date: string; departure_time: string; route?: { origin_city: string; destination_city: string } };
  user?: { full_name: string; phone_number: string };
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

export default function OperatorBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBookings(); }, []);

  const loadBookings = async () => {
    try {
      const res = await operatorBookingAPI.getMyBookings();
      setBookings(res.data.data.bookings || []);
    } catch { toast.error('Failed to load bookings'); } finally { setLoading(false); }
  };

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Bookings</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">PNR</th>
              <th className="px-4 py-3 font-medium text-gray-600">Passenger</th>
              <th className="px-4 py-3 font-medium text-gray-600">Route</th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium flex items-center gap-2"><Ticket className="h-4 w-4 text-blue-500" /> {b.pnr}</td>
                <td className="px-4 py-3 text-gray-600">{b.user?.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{b.trip?.route?.origin_city} → {b.trip?.route?.destination_city}</td>
                <td className="px-4 py-3 text-gray-600">{b.trip?.trip_date}</td>
                <td className="px-4 py-3 text-gray-600">NPR {b.total_amount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || 'bg-gray-100 text-gray-600'}`}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No bookings found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
