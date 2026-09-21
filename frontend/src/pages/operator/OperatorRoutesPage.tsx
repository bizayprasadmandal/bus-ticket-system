import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, MapPin, X, Search, ChevronLeft, ChevronRight, Clock, Navigation } from 'lucide-react';
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
  created_at: string;
}

export default function OperatorRoutesPage() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({ origin_city: '', destination_city: '', distance_km: 0, estimated_duration: '', base_fare: 0 });

  const itemsPerPage = 10;

  useEffect(() => { loadRoutes(); }, []);

  const loadRoutes = async () => {
    try {
      const res = await operatorRouteAPI.getMyRoutes();
      setRoutes(res.data.data.routes || []);
    } catch { toast.error('Failed to load routes'); } finally { setLoading(false); }
  };

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      const query = searchQuery.toLowerCase();
      return (
        route.origin_city.toLowerCase().includes(query) ||
        route.destination_city.toLowerCase().includes(query) ||
        route.distance_km.toString().includes(query)
      );
    });
  }, [routes, searchQuery]);

  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage);
  const paginatedRoutes = filteredRoutes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

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
      setShowModal(false);
      setEditingRoute(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Routes</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your bus routes and schedules</p>
        </div>
        <button
          onClick={() => { setEditingRoute(null); setForm({ origin_city: '', destination_city: '', distance_km: 0, estimated_duration: '', base_fare: 0 }); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Route
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Routes</p>
          <p className="text-2xl font-bold text-gray-800">{routes.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Avg. Distance</p>
          <p className="text-2xl font-bold text-blue-600">{routes.length > 0 ? Math.round(routes.reduce((sum, r) => sum + r.distance_km, 0) / routes.length) : 0} km</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Avg. Fare</p>
          <p className="text-2xl font-bold text-green-600">NPR {routes.length > 0 ? Math.round(routes.reduce((sum, r) => sum + r.base_fare, 0) / routes.length) : 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Unique Cities</p>
          <p className="text-2xl font-bold text-purple-600">
            {new Set([...routes.map(r => r.origin_city), ...routes.map(r => r.destination_city)]).size}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by origin, destination, or distance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Distance</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Base Fare</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedRoutes.map((route) => (
                <tr key={route.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                        <Navigation className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          <span className="text-green-600">{route.origin_city}</span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="text-red-600">{route.destination_city}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {route.distance_km} km
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {route.estimated_duration}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-green-600">NPR {route.base_fare.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(route)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(route.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedRoutes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No routes found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRoutes.length)} of {filteredRoutes.length}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">{editingRoute ? 'Edit Route' : 'Add Route'}</h2>
              <button onClick={() => { setShowModal(false); setEditingRoute(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Origin City *</label>
                <input placeholder="e.g. Kathmandu" value={form.origin_city} onChange={(e) => setForm({ ...form, origin_city: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination City *</label>
                <input placeholder="e.g. Pokhara" value={form.destination_city} onChange={(e) => setForm({ ...form, destination_city: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Distance (km) *</label>
                <input type="number" placeholder="Distance in km" value={form.distance_km || ''} onChange={(e) => setForm({ ...form, distance_km: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" min={1} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Duration *</label>
                <input placeholder="e.g. 6h 30m" value={form.estimated_duration} onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Base Fare (NPR) *</label>
                <input type="number" placeholder="Fare in NPR" value={form.base_fare || ''} onChange={(e) => setForm({ ...form, base_fare: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" min={0} required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                {editingRoute ? 'Update Route' : 'Create Route'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
