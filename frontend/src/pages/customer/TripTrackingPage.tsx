import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { Bus, Navigation, Clock, RefreshCw } from 'lucide-react';
import api from '../../api';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const busIcon = L.divIcon({
  className: '',
  html: `<div style="background:#3B82F6;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H6c-1.1 0-2.1.8-2.4 1.8L2 13c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2C2.3 15.3 3 18 3 18h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

interface Location {
  lat: number;
  lng: number;
}

interface TripLocation {
  location: Location;
  speed: number | null;
  updated_at: string;
}

interface TripInfo {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  status: string;
  route_stops: { lat: number; lng: number; name: string }[];
}

function FlyToBus({ position }: { position: Location }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], map.getZoom(), {
        duration: 1.5,
      });
    }
  }, [position, map]);

  return null;
}

export default function TripTrackingPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const socketRef = useRef<any>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const fetchTripData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [locationRes, tripRes] = await Promise.all([
          api.get(`/trips/${tripId}/location`),
          api.get(`/trips/${tripId}`),
        ]);

        const locData: TripLocation = locationRes.data;
        setLocation(locData.location);
        setSpeed(locData.speed);
        setLastUpdated(locData.updated_at);
        setTripInfo(tripRes.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load trip data');
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();

    const token = localStorage.getItem('token');
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

    try {
      socketRef.current = io(wsUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        socketRef.current.emit('subscribe_trip', { trip_id: tripId });
      });

      socketRef.current.on('bus_location_update', (data: TripLocation) => {
        setLocation(data.location);
        setSpeed(data.speed);
        setLastUpdated(data.updated_at);
      });

      socketRef.current.on('connect_error', () => {
        startPolling();
      });
    } catch {
      startPolling();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [tripId, retryCount]);

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      if (!tripId) return;
      try {
        const res = await api.get(`/trips/${tripId}/location`);
        const data: TripLocation = res.data;
        setLocation(data.location);
        setSpeed(data.speed);
        setLastUpdated(data.updated_at);
      } catch {
        // silently retry
      }
    }, 10000);
  }

  const formatTime = (iso: string) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="bg-gray-200 rounded-lg h-96"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <RefreshCw className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Trip</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const center: [number, number] = location
    ? [location.lat, location.lng]
    : [27.7, 85.3];

  const routePoints: [number, number][] = tripInfo?.route_stops
    ? tripInfo.route_stops.map((s) => [s.lat, s.lng])
    : location
    ? [[location.lat, location.lng]]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Bus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Trip Tracker</h1>
                {tripInfo && (
                  <p className="text-sm text-gray-500">
                    {tripInfo.origin} → {tripInfo.destination}
                  </p>
                )}
              </div>
            </div>
            {tripInfo && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  tripInfo.status === 'in_transit'
                    ? 'bg-green-100 text-green-700'
                    : tripInfo.status === 'delayed'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {tripInfo.status?.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '500px' }}>
          <MapContainer
            center={center}
            zoom={location ? 13 : 7}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {location && (
              <>
                <Marker position={[location.lat, location.lng]} icon={busIcon} />
                <FlyToBus position={location} />
              </>
            )}
            {routePoints.length > 1 && (
              <Polyline positions={routePoints} pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.8 }} />
            )}
          </MapContainer>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Navigation className="w-4 h-4" />
              Speed
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {speed !== null ? `${speed.toFixed(1)} km/h` : '--'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Last Updated
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatTime(lastUpdated)}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <RefreshCw className="w-4 h-4" />
              Departure
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {tripInfo?.departure_time ? formatTime(tripInfo.departure_time) : '--'}
            </p>
          </div>
        </div>

        {/* Route Stops */}
        {tripInfo?.route_stops && tripInfo.route_stops.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Route Stops</h3>
            <div className="space-y-2">
              {tripInfo.route_stops.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{stop.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
