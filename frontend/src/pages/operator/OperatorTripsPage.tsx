import { useState, useEffect } from 'react';
import { Plus, Calendar, X } from 'lucide-react';
import { operatorTripAPI, operatorBusAPI, operatorRouteAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import Dropdown from '../../components/Dropdown';
import DatePicker from '../../components/DatePicker';
import toast from 'react-hot-toast';

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  current_fare: number;
  available_seats: number;
  status: string;
  bus?: { bus_number: string };
  route?: { origin_city: string; destination_city: string };
}

export default function OperatorTripsPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ bus_id: 0, route_id: 0, trip_date: '', departure_time: '', current_fare: 0, available_seats: 30 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tripsRes, busesRes, routesRes] = await Promise.all([
        operatorTripAPI.getMyTrips(),
        operatorBusAPI.getMyBuses(),
        operatorRouteAPI.getMyRoutes(),
      ]);
      setTrips(tripsRes.data.data.trips || []);
      setBuses(busesRes.data.data.buses || []);
      setRoutes(routesRes.data.data.routes || []);
    } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await operatorTripAPI.create(form);
      toast.success('Trip created');
      setShowModal(false);
      setForm({ bus_id: 0, route_id: 0, trip_date: '', departure_time: '', current_fare: 0, available_seats: 30 });
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try { await operatorTripAPI.updateStatus(id, status); toast.success('Status updated'); loadData(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    BOARDING: 'bg-amber-100 text-amber-700',
    DEPARTED: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Trips</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Trip
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Route</th>
              <th className="px-4 py-3 font-medium text-gray-600">Bus</th>
              <th className="px-4 py-3 font-medium text-gray-600">Fare</th>
              <th className="px-4 py-3 font-medium text-gray-600">Seats</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trips.map((trip) => (
              <tr key={trip.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-500" /> {trip.trip_date}</td>
                <td className="px-4 py-3 text-gray-600">{trip.route?.origin_city} → {trip.route?.destination_city}</td>
                <td className="px-4 py-3 text-gray-600">{trip.bus?.bus_number}</td>
                <td className="px-4 py-3 text-gray-600">NPR {trip.current_fare}</td>
                <td className="px-4 py-3 text-gray-600">{trip.available_seats}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                    {trip.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select value={trip.status} onChange={(e) => handleStatusUpdate(trip.id, e.target.value)} className="text-xs border rounded px-2 py-1">
                    {Object.keys(statusColors).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {trips.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No trips found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Create Trip</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Dropdown
                label="Select Bus"
                value={form.bus_id ? String(form.bus_id) : ''}
                onChange={(val) => setForm({ ...form, bus_id: Number(val) })}
                options={buses.map((b) => ({
                  value: String(b.id),
                  label: `${b.bus_number} - ${b.bus_type}`,
                }))}
                placeholder="Select Bus"
              />
              <Dropdown
                label="Select Route"
                value={form.route_id ? String(form.route_id) : ''}
                onChange={(val) => setForm({ ...form, route_id: Number(val) })}
                options={routes.map((r) => ({
                  value: String(r.id),
                  label: `${r.origin_city} → ${r.destination_city}`,
                }))}
                placeholder="Select Route"
              />
              <DatePicker
                label="Trip Date"
                value={form.trip_date}
                onChange={(val) => setForm({ ...form, trip_date: val })}
                min={new Date().toISOString().split('T')[0]}
                placeholder="Select trip date"
              />
              <input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="number" placeholder="Fare (NPR)" value={form.current_fare || ''} onChange={(e) => setForm({ ...form, current_fare: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" min={0} required />
              <input type="number" placeholder="Available Seats" value={form.available_seats} onChange={(e) => setForm({ ...form, available_seats: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" min={1} required />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Create Trip</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
