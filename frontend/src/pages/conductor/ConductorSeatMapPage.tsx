import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Bus, MapPin, ArrowRight, Clock, Users, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';
import { bookingStatusLabel } from '../../utils/statusLabels';

interface PassengerDetail {
  name: string;
  seat_number: string;
  phone?: string;
}

interface SeatData {
  seat_number: string;
  status: 'AVAILABLE' | 'BOOKED' | 'BOARDING' | 'BLOCKED' | 'PENDING';
  booking_id?: number;
  passenger?: PassengerDetail;
  booking_status?: string;
}

interface TripInfo {
  id: number;
  trip_date: string;
  departure_time: string;
  status: string;
  route?: { origin_city: string; destination_city: string };
  bus?: { bus_number: string; bus_type: string; total_seats?: number };
}

interface TripSeatsResponse {
  trip: TripInfo;
  seats: SeatData[];
}

const seatColors: Record<string, string> = {
  BOARDING: 'bg-green-500 text-white',
  BOOKED: 'bg-blue-500 text-white',
  PENDING: 'bg-yellow-400 text-gray-800',
  AVAILABLE: 'bg-gray-200 text-gray-600',
  BLOCKED: 'bg-red-400 text-white',
};

const seatBorders: Record<string, string> = {
  BOARDING: 'border-green-600',
  BOOKED: 'border-blue-600',
  PENDING: 'border-yellow-500',
  AVAILABLE: 'border-gray-300',
  BLOCKED: 'border-red-500',
};

export default function ConductorSeatMapPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [data, setData] = useState<TripSeatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    try {
      const res = await api.get(`/trips/${tripId}/seats`);
      setData(res.data.data);
    } catch {
      toast.error('Failed to load seat data');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadData, 30000);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkBoarded = async (bookingId: number) => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/board`);
      toast.success('Passenger boarded successfully');
      loadData();
      setSelectedSeat(null);
    } catch {
      toast.error('Failed to mark as boarded');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async (bookingId: number) => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/no-show`);
      toast.success('Passenger marked as no-show');
      loadData();
      setSelectedSeat(null);
    } catch {
      toast.error('Failed to mark as no-show');
    } finally {
      setActionLoading(false);
    }
  };

  const getSeatLayout = (seats: SeatData[]) => {
    const totalSeats = seats.length;
    const seatsPerRow = totalSeats <= 30 ? 4 : 5;
    const rows: SeatData[][] = [];
    for (let i = 0; i < seats.length; i += seatsPerRow) {
      rows.push(seats.slice(i, i + seatsPerRow));
    }
    return { rows, seatsPerRow };
  };

  const stats = data ? {
    total: data.seats.length,
    booked: data.seats.filter(s => s.status === 'BOOKED').length,
    boarded: data.seats.filter(s => s.status === 'BOARDING').length,
    available: data.seats.filter(s => s.status === 'AVAILABLE').length,
    pending: data.seats.filter(s => s.status === 'PENDING').length,
    blocked: data.seats.filter(s => s.status === 'BLOCKED').length,
  } : null;

  if (loading) {
    return <TableSkeleton rows={5} cols={4} />;
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <Bus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Trip not found</p>
      </div>
    );
  }

  const { rows, seatsPerRow } = getSeatLayout(data.seats);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Seat Map</h1>
          <p className="text-sm text-gray-500 mt-1">Visual seat layout for the trip</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
            <Bus className="h-6 w-6 text-[#d84e55]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-gray-800">{data.trip.route?.origin_city}</span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <span className="font-semibold text-gray-800">{data.trip.route?.destination_city}</span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {data.trip.trip_date} {data.trip.departure_time}
              </span>
              <span className="flex items-center gap-1">
                <Bus className="h-3.5 w-3.5" /> {data.trip.bus?.bus_number}
              </span>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            data.trip.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
            data.trip.status === 'BOARDING' ? 'bg-amber-100 text-amber-700' :
            data.trip.status === 'DEPARTED' ? 'bg-green-100 text-green-700' :
            data.trip.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {data.trip.status}
          </span>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.booked}</p>
            <p className="text-xs text-gray-500">Booked</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.boarded}</p>
            <p className="text-xs text-gray-500">Boarded</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-400">{stats.available}</p>
            <p className="text-xs text-gray-500">Available</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-green-500" />
            <span className="text-gray-600">Boarded</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-gray-600">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-yellow-400" />
            <span className="text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-gray-200" />
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-red-400" />
            <span className="text-gray-600">Blocked</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-32 h-8 bg-gray-800 rounded-b-xl mb-6 flex items-center justify-center">
            <span className="text-white text-xs font-medium">Front</span>
          </div>

          <div className="space-y-3">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-3">
                <span className="w-6 text-center text-xs text-gray-400 font-medium">{rowIndex + 1}</span>
                <div className="flex gap-2">
                  {row.map((seat, seatIndex) => {
                    const isAisle = seatsPerRow > 4 && seatIndex === 2;
                    return (
                      <div key={seat.seat_number} className="flex items-center">
                        {isAisle && <div className="w-4" />}
                        <button
                          onClick={() => setSelectedSeat(selectedSeat?.seat_number === seat.seat_number ? null : seat)}
                          className={`w-12 h-12 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition-all hover:scale-105 ${
                            seatColors[seat.status] || 'bg-gray-200 text-gray-600'
                          } ${seatBorders[seat.status] || 'border-gray-300'} ${
                            selectedSeat?.seat_number === seat.seat_number ? 'ring-2 ring-[#d84e55] ring-offset-2' : ''
                          } ${seat.status === 'AVAILABLE' ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <span className="leading-none">{seat.seat_number}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="w-32 h-8 bg-gray-300 rounded-t-xl mt-6 flex items-center justify-center">
            <span className="text-gray-600 text-xs font-medium">Rear</span>
          </div>
        </div>
      </div>

      {selectedSeat && selectedSeat.passenger && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Seat {selectedSeat.seat_number} - Passenger Details
            </h3>
            <button
              onClick={() => setSelectedSeat(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium text-gray-800">{selectedSeat.passenger.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 text-gray-400 flex items-center justify-center text-xs">📱</span>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium text-gray-800">{selectedSeat.passenger.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-gray-500">Seat Number</p>
                <p className="font-medium text-gray-800">{selectedSeat.passenger.seat_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Booking Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedSeat.booking_status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                  selectedSeat.booking_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {bookingStatusLabel(selectedSeat.booking_status ?? '')}
                </span>
              </div>
            </div>
          </div>
          {selectedSeat.booking_id && selectedSeat.status !== 'BOARDING' && selectedSeat.status !== 'BLOCKED' && (
            <div className="flex gap-3">
              <button
                onClick={() => handleMarkBoarded(selectedSeat.booking_id!)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#d84e55] text-white rounded-lg font-medium hover:bg-[#c23e44] disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Boarded
              </button>
              <button
                onClick={() => handleNoShow(selectedSeat.booking_id!)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                No-Show
              </button>
            </div>
          )}
          {selectedSeat.status === 'BOARDING' && (
            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-100 text-green-700 rounded-lg font-medium">
              <CheckCircle className="h-4 w-4" />
              Boarded
            </span>
          )}
        </div>
      )}
    </div>
  );
}
