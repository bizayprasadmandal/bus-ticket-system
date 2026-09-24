import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, Search, ChevronLeft, ChevronRight, RefreshCw, Plus, Edit, Trash2, X } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface CityItem {
  id: number;
  name: string;
  name_nepali?: string;
  district?: string;
  province?: string;
  latitude: number;
  longitude: number;
  is_major_city: boolean;
  created_at?: string;
}

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCity, setEditingCity] = useState<CityItem | null>(null);
  const [form, setForm] = useState({ name: '', name_nepali: '', district: '', province: '', latitude: 0, longitude: 0, is_major_city: false });
  const [submitting, setSubmitting] = useState(false);

  const itemsPerPage = 10;

  const loadCities = useCallback(async () => {
    try {
      const res = await api.get('/cities');
      setCities(res.data.data.cities || res.data.data || []);
    } catch {
      toast.error('Failed to load cities');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadCities, 30000);

  useEffect(() => { loadCities(); }, [loadCities]);

  const filteredCities = useMemo(() => {
    return cities.filter((city) => {
      const q = searchQuery.toLowerCase();
      return (
        city.name?.toLowerCase().includes(q) ||
        city.province?.toLowerCase().includes(q) ||
        city.district?.toLowerCase().includes(q)
      );
    });
  }, [cities, searchQuery]);

  const totalPages = Math.ceil(filteredCities.length / itemsPerPage);
  const paginatedCities = filteredCities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const openCreate = () => {
    setEditingCity(null);
    setForm({ name: '', name_nepali: '', district: '', province: '', latitude: 0, longitude: 0, is_major_city: false });
    setShowModal(true);
  };

  const openEdit = (city: CityItem) => {
    setEditingCity(city);
    setForm({
      name: city.name,
      name_nepali: city.name_nepali || '',
      district: city.district || '',
      province: city.province || '',
      latitude: city.latitude,
      longitude: city.longitude,
      is_major_city: city.is_major_city,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCity) {
        await api.put(`/cities/${editingCity.id}`, form);
        toast.success('City updated');
      } else {
        await api.post('/cities', form);
        toast.success('City created');
      }
      setShowModal(false);
      setEditingCity(null);
      loadCities();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMajor = async (city: CityItem) => {
    try {
      await api.put(`/cities/${city.id}`, { is_major_city: !city.is_major_city });
      toast.success(`City ${city.is_major_city ? 'removed from' : 'added to'} major cities`);
      loadCities();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (city: CityItem) => {
    if (!window.confirm(`Delete city "${city.name}"?`)) return;
    try {
      await api.delete(`/cities/${city.id}`);
      toast.success('City deleted');
      loadCities();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete city');
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cities</h1>
          <p className="text-sm text-gray-500 mt-1">Manage cities and locations</p>
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
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#d84e55] text-white px-4 py-2 rounded-lg hover:bg-[#c4434a] transition-colors"
          >
            <Plus className="h-4 w-4" /> Add City
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by city name, district, or province..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">City</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">District</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Province</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Major City</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedCities.map((city) => (
                <tr key={city.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-[#d84e55]" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">{city.name}</span>
                        {city.name_nepali && <p className="text-xs text-gray-400">{city.name_nepali}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{city.district || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{city.province || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMajor(city)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        city.is_major_city
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${city.is_major_city ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {city.is_major_city ? 'Major' : 'Minor'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(city)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(city)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedCities.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No cities found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCities.length)} of {filteredCities.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-[#d84e55] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">{editingCity ? 'Edit City' : 'Add City'}</h2>
              <button onClick={() => { setShowModal(false); setEditingCity(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City Name *</label>
                <input
                  placeholder="e.g. Kathmandu"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City Name (Nepali)</label>
                <input
                  placeholder="e.g. काठमाडौं"
                  value={form.name_nepali}
                  onChange={(e) => setForm({ ...form, name_nepali: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">District</label>
                  <input
                    placeholder="e.g. Kathmandu"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Province</label>
                  <input
                    placeholder="e.g. Bagmati"
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_major_city}
                  onChange={(e) => setForm({ ...form, is_major_city: e.target.checked })}
                  className="rounded border-gray-300 text-[#d84e55] focus:ring-[#d84e55]"
                />
                Major city (shown in search defaults)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="27.7172"
                    value={form.latitude || ''}
                    onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="85.3240"
                    value={form.longitude || ''}
                    onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#d84e55] text-white py-2.5 rounded-lg font-medium hover:bg-[#c4434a] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingCity ? 'Update City' : 'Create City'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
