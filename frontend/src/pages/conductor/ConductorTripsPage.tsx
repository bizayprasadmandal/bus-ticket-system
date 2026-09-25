import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Bus, Users, MapPin, ArrowRight, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { conductorTripAPI, conductorBookingAPI } from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  status: string;
  bus?: { id: number; bus_number: string; bus_type: string };
  route?: { id: number; origin_city: string; destination_city: string };
}

interface PassengerItem {
  passenger_name: string;
  seat_number: string;
  phone_number?: string;
}

interface TripWithPassengers extends TripItem {
  passengers: PassengerItem[];
  passengerCount: number;
}

export default function ConductorTripsPage() {
  const [trips, setTrips] = useState<TripWithPassengers[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const tripsRes = await conductorTripAPI.getMyTrips();
      const rawTrips: TripItem[] = tripsRes.data.data.trips || [];

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const todayTrips = rawTrips.filter(t => t.trip_date === today);

      const bookingsRes = await conductorBookingAPI.getMyBookings();
      const bookings = bookingsRes.data.data.bookings || [];
      const passengersByTrip = new Map<number, PassengerItem[]>();
      bookings.forEach((b: any) => {
        if (!b.trip_id) return;
        const list = passengersByTrip.get(b.trip_id) || [];
        (b.passengers || []).forEach((p: PassengerItem) => list.push(p));
        passengersByTrip.set(b.trip_id, list);
      });

      setTrips(todayTrips.map(t => {
        const passengers = passengersByTrip.get(t.id) || [];
        return { ...t, passengers, passengerCount: passengers.length };
      }));
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadData, 30000, true, false);

  const toggleExpand = (tripId: number) => {
    setExpandedTripId(prev => (prev === tripId ? null : tripId));
  };

  useEffect(() => { loadData(); }, [loadData]);

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    BOARDING: 'bg-amber-100 text-amber-700',
    DEPARTED: 'bg-purple-100 text-purple-700',
    ARRIVED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
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
          <h1 className="text-2xl font-bold text-gray-800">My Trips</h1>
          <p className="text-sm text-gray-500 mt-1">View today's trips and passenger lists</p>
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

      {trips.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No trips scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-stretch">
              <button
                onClick={() => toggleExpand(trip.id)}
                className="flex-1 p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-gray-800">{trip.route?.origin_city}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-gray-800">{trip.route?.destination_city}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {trip.departure_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bus className="h-3.5 w-3.5" /> {trip.bus?.bus_number}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {trip.passengerCount} passengers
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                      {trip.status}
                    </span>
                    {expandedTripId === trip.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>
              <div className="flex items-center pr-5 pl-4 border-l border-gray-100">
                <Link
                  to={`/conductor/seat-map/${trip.id}`}
                  className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  Seat Map
                </Link>
              </div>
              </div>

              {expandedTripId === trip.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  {trip.passengers.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Passengers ({trip.passengers.length})
                      </h4>
                      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-600">#</th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Name</th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Seat</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {trip.passengers.map((p, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                                <td className="px-4 py-2.5 font-medium text-gray-800">{p.passenger_name}</td>
                                <td className="px-4 py-2.5">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                    {p.seat_number}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No passengers yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
