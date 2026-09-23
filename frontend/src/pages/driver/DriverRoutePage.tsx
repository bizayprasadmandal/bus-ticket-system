import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Bus, Users, Phone, User, ArrowLeft, RefreshCw, Loader2, Route, Navigation } from 'lucide-react';
import api from '../../api';
import { driverTripAPI } from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

interface TripDetail {
  id: number;
  trip_date: string;
  departure_time: string;
  arrival_time?: string;
  status: string;
  bus?: { id: number; bus_number: string; bus_type: string; total_seats?: number };
  route?: {
    id: number;
    origin_city: string;
    destination_city: string;
    distance?: number;
    stops?: string | string[];
  };
  driver_name?: string;
  driver_phone?: string;
  conductor_name?: string;
  conductor_phone?: string;
  [key: string]: any;
}

export default function DriverRoutePage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [passengerCount, setPassengerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [tripRes, passengersRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/passengers`).catch(() => ({ data: { data: { passengers: [] } } })),
      ]);
      setTrip(tripRes.data.data);
      const passengers = passengersRes.data.data?.passengers || [];
      setPassengerCount(passengers.length);
    } catch {
      toast.error('Failed to load trip details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  const handleStatusUpdate = async (status: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      await driverTripAPI.updateStatus(Number(id), status);
      toast.success(`Trip marked as ${status.toLowerCase()}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const calculateDuration = (departure?: string, arrival?: string) => {
    if (!departure || !arrival) return 'N/A';
    const [dH, dM] = departure.split(':').map(Number);
    const [aH, aM] = arrival.split(':').map(Number);
    let diffMin = (aH * 60 + aM) - (dH * 60 + dM);
    if (diffMin < 0) diffMin += 24 * 60;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}h ${m}m`;
  };

  const parseStops = (stops?: string | string[]): string[] => {
    if (!stops) return [];
    if (Array.isArray(stops)) return stops;
    try {
      const parsed = JSON.parse(stops);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    BOARDING: 'bg-amber-100 text-amber-700',
    DEPARTED: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    ARRIVED: 'bg-purple-100 text-purple-700',
  };

  const statusActions: Record<string, { label: string; next: string; color: string }> = {
    SCHEDULED: { label: 'Start Boarding', next: 'BOARDING', color: 'bg-blue-600 hover:bg-blue-700' },
    BOARDING: { label: 'Mark Departed', next: 'DEPARTED', color: 'bg-green-600 hover:bg-green-700' },
    DEPARTED: { label: 'Mark Arrived', next: 'ARRIVED', color: 'bg-purple-600 hover:bg-purple-700' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Trip not found</p>
        <Link to="/driver/trips" className="text-[#d84e55] hover:underline mt-2 inline-block">← Back to Trips</Link>
      </div>
    );
  }

  const stops = parseStops(trip.route?.stops as any);
  const action = statusActions[trip.status];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/driver/trips" className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#d84e55] transition-colors mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Trips
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">
            {trip.route?.origin_city} → {trip.route?.destination_city}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
              {trip.status}
            </span>
            <span className="text-sm text-gray-500">{trip.trip_date}</span>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {trip.departure_time}
              {trip.arrival_time && ` → ${trip.arrival_time}`}
            </span>
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Route className="h-5 w-5 text-[#d84e55]" /> Route Info
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Origin</p>
                <p className="text-sm font-medium text-gray-800">{trip.route?.origin_city || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Navigation className="h-5 w-5 text-[#d84e55]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Destination</p>
                <p className="text-sm font-medium text-gray-800">{trip.route?.destination_city || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-gray-500">Distance</p>
                <p className="text-sm font-medium text-gray-800">{trip.route?.distance ? `${trip.route.distance} km` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-medium text-gray-800">{calculateDuration(trip.departure_time, trip.arrival_time)}</p>
              </div>
            </div>
            {stops.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Stops</p>
                <div className="flex flex-wrap gap-2">
                  {stops.map((stop, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {stop}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bus className="h-5 w-5 text-[#d84e55]" /> Bus Info
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Bus Number</span>
              <span className="text-sm font-medium text-gray-800">{trip.bus?.bus_number || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Type</span>
              <span className="text-sm font-medium text-gray-800">{trip.bus?.bus_type || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Seats</span>
              <span className="text-sm font-medium text-gray-800">{trip.bus?.total_seats || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-[#d84e55]" /> Crew
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Driver</span>
              <span className="text-sm font-medium text-gray-800">{trip.driver_name || 'N/A'}</span>
            </div>
            {trip.driver_phone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Driver Phone</span>
                <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {trip.driver_phone}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Conductor</span>
              <span className="text-sm font-medium text-gray-800">{trip.conductor_name || 'N/A'}</span>
            </div>
            {trip.conductor_phone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Conductor Phone</span>
                <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {trip.conductor_phone}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#d84e55]" /> Passengers
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-purple-600">{passengerCount}</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Passengers</p>
              <p className="text-sm text-gray-500">Boarded for this trip</p>
            </div>
          </div>
        </div>
      </div>

      {action && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
          <button
            onClick={() => handleStatusUpdate(action.next)}
            disabled={updating}
            className={`flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${action.color}`}
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
