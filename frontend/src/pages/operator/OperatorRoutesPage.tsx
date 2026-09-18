import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, X } from 'lucide-react';
import { operatorRouteAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface RouteItem {
  id: number;
  origin_city: string;
  destination_city: string;
  distance_km: number;
  estimated_duration: string;
  base_fare: number;
  status: string;
}

export default function OperatorRoutesPage() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);
  const [form, setForm] = useState({ origin_city: '', destination_city: '', distance_km: 0, estimated_duration: '', base_fare: 0 });

  useEffect(() => { loadRoutes(); }, []);

  const loadRoutes = async () => {
    try {
      const res = await operatorRouteAPI.getMyRoutes();
      setRoutes(res.data.data.routes);
    } catch { toast.error('Failed to load routes'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoute) {
        await operatorRouteAPI.update(editingRoute.id, form);
        toast.success('Route updated');
      } else {
        await operatorRouteAPI.create(form);
        toast.success('Route created');
      }
      setShowModal(false); setEditingRoute(null);
      setForm({ origin_city: '', destination_city: '', distance_km: 0, estimated_duration: '', base_fare: 0 });
      loadRoutes();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Operation failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this route?')) return;
    try { await operatorRouteAPI.delete(id); toast.success('Route deleted'); loadRoutes(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openEdit = (route: RouteItem) => {
    setEditingRoute(route);
    setForm({ origin_city: route.origin_city, destination_city: route.destination_city, distance_km: route.distance_km, estimated_duration: route.estimated_duration, base_fare: route.base_fare });
    setShowModal(true);
  };

  if (loading) return <TableSkeleton rows={4} cols={5} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Routes</h1>
        <button onClick={() => { setEditingRoute(null); setForm({ origin_city: '', destination_city: '', distance_km: 0, estimated_duration: '', base_fare: 0 }); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Route
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Origin</th>
              <th className="px-4 py-3 font-medium text-gray-600">Destination</th>
              <th className="px-4 py-3 font-medium text-gray-600">Distance</th>
              <th className="px-4 py-3 font-medium text-gray-600">Duration</th>
              <th className="px-4 py-3 font-medium text-gray-600">Base Fare</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {routes.map((route) => (
              <tr key={route.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-green-500" /> {route.origin_city}</td>
                <td className="px-4 py-3 text-gray-600">{route.destination_city}</td>
                <td className="px-4 py-3 text-gray-600">{route.distance_km} km</td>
                <td className="px-4 py-3 text-gray-600">{route.estimated_duration}</td>
                <td className="px-4 py-3 text-gray-600">NPR {route.base_fare}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(route)} className="p-1 text-gray-500 hover:text-blue-600"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(route.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {routes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No routes found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingRoute ? 'Edit Route' : 'Add Route'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input placeholder="Origin City" value={form.origin_city} onChange={(e) => setForm({ ...form, origin_city: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <input placeholder="Destination City" value={form.destination_city} onChange={(e) => setForm({ ...form, destination_city: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="number" placeholder="Distance (km)" value={form.distance_km || ''} onChange={(e) => setForm({ ...form, distance_km: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" min={1} required />
              <input placeholder="Duration (e.g. 6h 30m)" value={form.estimated_duration} onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="number" placeholder="Base Fare (NPR)" value={form.base_fare || ''} onChange={(e) => setForm({ ...form, base_fare: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" min={0} required />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                {editingRoute ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
