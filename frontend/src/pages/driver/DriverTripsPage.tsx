import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Search, Clock, Bus, MapPin, ArrowRight, RefreshCw, Route } from 'lucide-react';
import { driverTripAPI } from '../../api';
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
  available_seats?: number;
  [key: string]: any;
}

const statusWorkflow: Record<string, { next: string; label: string; color: string }> = {
  SCHEDULED: { next: 'BOARDING', label: 'Start Boarding', color: 'bg-blue-600 hover:bg-blue-700' },
  BOARDING: { next: 'DEPARTED', label: 'Mark Departed', color: 'bg-green-600 hover:bg-green-700' },
  DEPARTED: { next: 'ARRIVED', label: 'Mark Arrived', color: 'bg-purple-600 hover:bg-purple-700' },
};

export default function DriverTripsPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await driverTripAPI.getMyTrips();
      setTrips(res.data.data.trips || []);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadData, 30000);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const query = searchQuery.toLowerCase();
      return (
        trip.route?.origin_city?.toLowerCase().includes(query) ||
        trip.route?.destination_city?.toLowerCase().includes(query) ||
        trip.bus?.bus_number?.toLowerCase().includes(query) ||
        trip.trip_date.includes(query)
      );
    });
  }, [trips, searchQuery]);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await driverTripAPI.updateStatus(id, status);
      toast.success(`Trip marked as ${status.toLowerCase()}`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
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

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Trips</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage your assigned trips</p>
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
            placeholder="Search by route or bus number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      {filteredTrips.length > 0 ? (
        <div className="space-y-4">
          {filteredTrips.map((trip) => {
            const workflow = statusWorkflow[trip.status];
            return (
              <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium text-gray-800">{trip.route?.origin_city}</span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="font-medium text-gray-800">{trip.route?.destination_city}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {trip.departure_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bus className="h-3 w-3" /> {trip.bus?.bus_number}
                        </span>
                        <span>{trip.trip_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/driver/trip/${trip.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Route className="h-3 w-3" /> Route Info
                    </Link>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                      {trip.status}
                    </span>
                    {workflow && (
                      <button
                        onClick={() => handleStatusUpdate(trip.id, workflow.next)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${workflow.color}`}
                      >
                        {workflow.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No trips found</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchQuery ? 'Try a different search term' : 'No trips assigned yet'}
          </p>
        </div>
      )}
    </div>
  );
}
