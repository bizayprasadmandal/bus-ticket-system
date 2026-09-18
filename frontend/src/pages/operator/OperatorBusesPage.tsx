import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Bus, X } from 'lucide-react';
import { operatorBusAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
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
  const [form, setForm] = useState({
    bus_number: '',
    bus_model: '',
    bus_type: 'AC',
    total_seats: 30,
  });

  useEffect(() => {
    loadBuses();
  }, []);

  const loadBuses = async () => {
    try {
      const res = await operatorBusAPI.getMyBuses();
      setBuses(res.data.data.buses);
    } catch {
      toast.error('Failed to load buses');
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async (id: number) => {
    if (!confirm('Retire this bus?')) return;
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

  if (loading) return <TableSkeleton rows={4} cols={5} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Buses</h1>
        <button onClick={() => { setEditingBus(null); setForm({ bus_number: '', bus_model: '', bus_type: 'AC', total_seats: 30 }); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Bus
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Bus Number</th>
              <th className="px-4 py-3 font-medium text-gray-600">Model</th>
              <th className="px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 font-medium text-gray-600">Seats</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {buses.map((bus) => (
              <tr key={bus.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2"><Bus className="h-4 w-4 text-blue-500" /> {bus.bus_number}</td>
                <td className="px-4 py-3 text-gray-600">{bus.bus_model}</td>
                <td className="px-4 py-3 text-gray-600">{bus.bus_type}</td>
                <td className="px-4 py-3 text-gray-600">{bus.total_seats}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${bus.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {bus.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(bus)} className="p-1 text-gray-500 hover:text-blue-600"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(bus.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {buses.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No buses found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingBus ? 'Edit Bus' : 'Add Bus'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input placeholder="Bus Number" value={form.bus_number} onChange={(e) => setForm({ ...form, bus_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <input placeholder="Bus Model" value={form.bus_model} onChange={(e) => setForm({ ...form, bus_model: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              <select value={form.bus_type} onChange={(e) => setForm({ ...form, bus_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="AC">AC</option>
                <option value="DELUXE">Deluxe</option>
                <option value="SLEEPER">Sleeper</option>
                <option value="VIP">VIP</option>
              </select>
              <input type="number" placeholder="Total Seats" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" min={1} required />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                {editingBus ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
