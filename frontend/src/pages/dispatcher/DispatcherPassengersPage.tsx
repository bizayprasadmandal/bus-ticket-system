import { useState, useCallback, useEffect } from 'react';
import { Users, MapPin, ArrowRight, Clock, Bus, ChevronDown } from 'lucide-react';
import { dispatcherTripAPI } from '../../api';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  status: string;
  bus?: { id: number; bus_number: string; bus_type: string };
  route?: { id: number; origin_city: string; destination_city: string };
}

interface Passenger {
  name: string;
  seat_number: string;
  phone_number: string;
  pnr: string;
  booking_status: string;
  payment_status: string;
}

interface PassengerData {
  trip?: TripItem;
  passengers?: Passenger[];
}

export default function DispatcherPassengersPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [passengerData, setPassengerData] = useState<PassengerData>({});
  const [loadingPassengers, setLoadingPassengers] = useState(false);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await dispatcherTripAPI.getMyTrips();
      setTrips(res.data.data?.trips || []);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  const { isRefreshing, refresh } = useAutoRefresh(fetchTrips, 30000);

  const fetchPassengers = useCallback(async (tripId: number) => {
    try {
      setLoadingPassengers(true);
      const res = await api.get(`/trips/${tripId}/passengers`);
      setPassengerData(res.data.data || {});
    } catch {
      toast.error('Failed to load passengers');
      setPassengerData({});
    } finally {
      setLoadingPassengers(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      fetchPassengers(selectedTripId);
    } else {
      setPassengerData({});
    }
  }, [selectedTripId, fetchPassengers]);

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    BOARDING: 'bg-amber-100 text-amber-700',
    DEPARTED: 'bg-purple-100 text-purple-700',
    ARRIVED: 'bg-teal-100 text-teal-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  const selectedTrip = trips.find((t) => t.id === selectedTripId);
  const passengers = passengerData.passengers || [];
  const totalPassengers = passengers.length;
  const totalBookings = new Set(passengers.map((p) => p.pnr)).size;

  if (loadingTrips) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Passenger Manifest</h1>
          <p className="text-sm text-gray-500 mt-1">View passenger details for each trip</p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Trip Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select a Trip</label>
        <div className="relative">
          <select
            value={selectedTripId ?? ''}
            onChange={(e) => setSelectedTripId(e.target.value ? Number(e.target.value) : null)}
            className="w-full appearance-none px-4 py-3 pr-10 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="">Select a trip...</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.route?.origin_city} → {trip.route?.destination_city} | {trip.trip_date} {trip.departure_time} | {trip.bus?.bus_number}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Trip Info Header */}
      {selectedTrip && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-green-600">{selectedTrip.route?.origin_city}</span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className="font-medium text-red-600">{selectedTrip.route?.destination_city}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Bus className="h-4 w-4 text-gray-400" />
              {selectedTrip.bus?.bus_number} ({selectedTrip.bus?.bus_type})
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4 text-gray-400" />
              {selectedTrip.trip_date} {selectedTrip.departure_time}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[selectedTrip.status] || 'bg-gray-100 text-gray-600'}`}>
              {selectedTrip.status}
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {selectedTripId && !loadingPassengers && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-[#d84e55]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalPassengers}</p>
                <p className="text-xs text-gray-500">Total Passengers</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalBookings}</p>
                <p className="text-xs text-gray-500">Total Bookings</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Table */}
      {selectedTripId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingPassengers ? (
            <TableSkeleton rows={5} cols={7} />
          ) : passengers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Seat</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Booking Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {passengers.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-700">{p.seat_number}</td>
                      <td className="px-4 py-3 text-gray-700">{p.phone_number}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">{p.pnr}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.booking_status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : p.booking_status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {p.booking_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : p.payment_status === 'REFUNDED' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {p.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No passengers found for this trip</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedTripId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select a trip to view passengers</p>
        </div>
      )}
    </div>
  );
}
