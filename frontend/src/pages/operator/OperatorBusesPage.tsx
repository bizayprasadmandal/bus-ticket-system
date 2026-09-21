import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Bus, X, Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { operatorBusAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import Dropdown from '../../components/Dropdown';
import toast from 'react-hot-toast';

interface BusItem {
  id: number;
  bus_number: string;
  bus_model: string;
  bus_type: string;
  total_seats: number;
  status: string;
  created_at: string;
}

export default function OperatorBusesPage() {
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBus, setEditingBus] = useState<BusItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({ bus_number: '', bus_model: '', bus_type: 'AC', total_seats: 30 });

  const itemsPerPage = 10;

  useEffect(() => { loadBuses(); }, []);

  const loadBuses = async () => {
    try {
      const res = await operatorBusAPI.getMyBuses();
      setBuses(res.data.data.buses || []);
    } catch { toast.error('Failed to load buses'); } finally { setLoading(false); }
  };

  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      const matchesSearch =
        bus.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bus.bus_model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'ALL' || bus.bus_type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || bus.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [buses, searchQuery, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredBuses.length / itemsPerPage);
  const paginatedBuses = filteredBuses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, typeFilter, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBus) {
        await operatorBusAPI.update(editingBus.id, form);
        toast.success('Bus updated');
      } else {
        await operatorBusAPI.create(form);
        toast.success('Bus created');
      }
      setShowModal(false);
      setEditingBus(null);
      setForm({ bus_number: '', bus_model: '', bus_type: 'AC', total_seats: 30 });
      loadBuses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number, busNumber: string) => {
    if (!confirm(`Retire bus "${busNumber}"?`)) return;
    try {
      await operatorBusAPI.delete(id);
      toast.success('Bus retired');
      loadBuses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to retire bus');
    }
  };

  const openEdit = (bus: BusItem) => {
    setEditingBus(bus);
    setForm({ bus_number: bus.bus_number, bus_model: bus.bus_model, bus_type: bus.bus_type, total_seats: bus.total_seats });
    setShowModal(true);
  };

  const getBusTypeColor = (type: string) => {
    switch (type) {
      case 'AC': return 'bg-blue-100 text-blue-700';
      case 'DELUXE': return 'bg-purple-100 text-purple-700';
      case 'SLEEPER': return 'bg-indigo-100 text-indigo-700';
      case 'VIP': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={4} cols={5} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Buses</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your bus fleet</p>
        </div>
        <button
          onClick={() => { setEditingBus(null); setForm({ bus_number: '', bus_model: '', bus_type: 'AC', total_seats: 30 }); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Bus
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Buses</p>
          <p className="text-2xl font-bold text-gray-800">{buses.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{buses.filter(b => b.status === 'ACTIVE').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Capacity</p>
          <p className="text-2xl font-bold text-blue-600">{buses.reduce((sum, b) => sum + b.total_seats, 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-red-600">{buses.filter(b => b.status !== 'ACTIVE').length}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by bus number or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="ALL">All Types</option>
            <option value="AC">AC</option>
            <option value="DELUXE">Deluxe</option>
            <option value="SLEEPER">Sleeper</option>
            <option value="VIP">VIP</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Bus</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Model</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Capacity</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedBuses.map((bus) => (
                <tr key={bus.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Bus className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-800">{bus.bus_number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{bus.bus_model}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getBusTypeColor(bus.bus_type)}`}>
                      {bus.bus_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {bus.total_seats}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      bus.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {bus.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(bus)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(bus.id, bus.bus_number)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Retire">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedBuses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Bus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No buses found</p>
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBuses.length)} of {filteredBuses.length}
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
              <h2 className="text-lg font-semibold text-gray-800">{editingBus ? 'Edit Bus' : 'Add Bus'}</h2>
              <button onClick={() => { setShowModal(false); setEditingBus(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bus Number *</label>
                <input placeholder="e.g. NA-1234" value={form.bus_number} onChange={(e) => setForm({ ...form, bus_number: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bus Model *</label>
                <input placeholder="e.g. Tata Starbus" value={form.bus_model} onChange={(e) => setForm({ ...form, bus_model: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bus Type *</label>
                <Dropdown
                  value={form.bus_type}
                  onChange={(val) => setForm({ ...form, bus_type: val })}
                  options={[
                    { value: 'AC', label: 'AC' },
                    { value: 'DELUXE', label: 'Deluxe' },
                    { value: 'SLEEPER', label: 'Sleeper' },
                    { value: 'VIP', label: 'VIP' },
                  ]}
                  placeholder="Select bus type"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Seats *</label>
                <input type="number" placeholder="Number of seats" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" min={1} required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                {editingBus ? 'Update Bus' : 'Create Bus'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
