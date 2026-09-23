import { useState, useCallback } from 'react';
import { Users, MapPin, ArrowRight, Clock, Bus, X, Loader2 } from 'lucide-react';
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
  driver_name?: string;
  driver_phone?: string;
  conductor_name?: string;
  conductor_phone?: string;
}

interface CrewFormData {
  driver_name: string;
  driver_phone: string;
  conductor_name: string;
  conductor_phone: string;
}

const emptyForm: CrewFormData = { driver_name: '', driver_phone: '', conductor_name: '', conductor_phone: '' };

export default function DispatcherCrewPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripItem | null>(null);
  const [form, setForm] = useState<CrewFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await dispatcherTripAPI.getMyTrips();
      setTrips(res.data.data?.trips || []);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, refresh } = useAutoRefresh(fetchData, 30000);

  const openCrewModal = (trip: TripItem) => {
    setSelectedTrip(trip);
    setForm({
      driver_name: trip.driver_name || '',
      driver_phone: trip.driver_phone || '',
      conductor_name: trip.conductor_name || '',
      conductor_phone: trip.conductor_phone || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTrip) return;
    try {
      setSaving(true);
      await api.put(`/trips/${selectedTrip.id}/assign-crew`, form);
      toast.success('Crew assigned successfully');
      setModalOpen(false);
      setSelectedTrip(null);
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign crew');
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    BOARDING: 'bg-amber-100 text-amber-700',
    DEPARTED: 'bg-purple-100 text-purple-700',
    ARRIVED: 'bg-teal-100 text-teal-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Crew Assignment</h1>
          <p className="text-sm text-gray-500 mt-1">Assign drivers and conductors to today's trips</p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <Loader2 className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Bus</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date/Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Driver</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Conductor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-green-600 font-medium">{trip.route?.origin_city}</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="text-red-600 font-medium">{trip.route?.destination_city}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Bus className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-800">{trip.bus?.bus_number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800">{trip.trip_date}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" /> {trip.departure_time}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {trip.driver_name || <span className="text-gray-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {trip.conductor_name || <span className="text-gray-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openCrewModal(trip)}
                      className="px-3 py-1.5 text-xs font-medium bg-[#d84e55] text-white rounded-lg hover:bg-[#c4434b] transition-colors"
                    >
                      Assign Crew
                    </button>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No trips found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Crew Assignment Modal */}
      {modalOpen && selectedTrip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Assign Crew</h3>
                <p className="text-sm text-gray-500">
                  {selectedTrip.route?.origin_city} → {selectedTrip.route?.destination_city}
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  value={form.driver_name}
                  onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                  placeholder="Enter driver name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Phone</label>
                <input
                  type="text"
                  value={form.driver_phone}
                  onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
                  placeholder="Enter driver phone"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conductor Name</label>
                <input
                  type="text"
                  value={form.conductor_name}
                  onChange={(e) => setForm({ ...form, conductor_name: e.target.value })}
                  placeholder="Enter conductor name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conductor Phone</label>
                <input
                  type="text"
                  value={form.conductor_phone}
                  onChange={(e) => setForm({ ...form, conductor_phone: e.target.value })}
                  placeholder="Enter conductor phone"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-[#d84e55] text-white rounded-lg hover:bg-[#c4434b] disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
