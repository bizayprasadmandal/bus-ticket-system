import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, X, Search, Clock, Bus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { operatorTripAPI, operatorBusAPI, operatorRouteAPI } from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import ServerPagination from '../../components/ServerPagination';
import Dropdown from '../../components/Dropdown';
import DatePicker from '../../components/DatePicker';
import toast from 'react-hot-toast';

const TODAY_NPT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date());

// Mirrors VALID_STATUS_TRANSITIONS in routes/trips.js
const STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['BOARDING', 'CANCELLED'],
  BOARDING: ['DEPARTED', 'CANCELLED'],
  DEPARTED: ['ARRIVED'],
  ARRIVED: [],
  CANCELLED: [],
};

interface TripItem {
  id: number;
  trip_date: string;
  departure_time: string;
  current_fare: number;
  available_seats: number;
  status: string;
  bus?: { id: number; bus_number: string; bus_type: string };
  route?: { id: number; origin_city: string; destination_city: string };
}

export default function OperatorTripsPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState({ total: 0, scheduled: 0, boarding: 0, arrived: 0, cancelled: 0 });
  const [form, setForm] = useState({ bus_id: 0, route_id: 0, trip_date: '', departure_time: '', current_fare: 0, available_seats: 30 });

  const itemsPerPage = 10;

  const loadTrips = useCallback(async () => {
    try {
      const res = await operatorTripAPI.getMyTrips({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      const data = res.data.data || {};
      const rows: TripItem[] = data.trips || [];
      setTrips(rows);
      if (data.pagination) {
        setTotalPages(data.pagination.total_pages || 1);
        setTotalItems(data.pagination.total_items ?? rows.length);
      } else {
        setTotalPages(1);
        setTotalItems(rows.length);
      }
      if (data.summary) {
        setSummary(data.summary);
      } else {
        setSummary({
          total: rows.length,
          scheduled: rows.filter(t => t.status === 'SCHEDULED').length,
          boarding: rows.filter(t => t.status === 'BOARDING').length,
          arrived: rows.filter(t => t.status === 'ARRIVED').length,
          cancelled: rows.filter(t => t.status === 'CANCELLED').length,
        });
      }
    } catch { toast.error('Failed to load trips'); } finally { setLoading(false); }
  }, [currentPage, searchQuery, statusFilter]);

  const loadFormOptions = useCallback(async () => {
    try {
      const [busesRes, routesRes] = await Promise.all([
        operatorBusAPI.getMyBuses(),
        operatorRouteAPI.getMyRoutes(),
      ]);
      setBuses(busesRes.data.data.buses || []);
      setRoutes(routesRes.data.data.routes || []);
    } catch { toast.error('Failed to load buses/routes'); }
  }, []);

  useEffect(() => { loadFormOptions(); }, [loadFormOptions]);
  useEffect(() => { loadTrips(); }, [loadTrips]);
  // Debounce server-side search so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadTrips, 30000, true, false);

  const resetPage = () => setCurrentPage(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) {
      if (!form.bus_id) return toast.error('Select a bus.');
      if (!form.route_id) return toast.error('Select a route.');
      if (form.available_seats < 1) return toast.error('Available seats must be at least 1.');
    }
    if (!form.trip_date) return toast.error('Select a trip date.');
    if (!form.departure_time) return toast.error('Select a departure time.');
    if (!(form.current_fare >= 1)) return toast.error('Fare must be at least 1.');
    try {
      if (editingTrip) {
        // Backend PUT only accepts these fields; bus/route/seats are not
        // editable after creation (sending seats would reset sold tickets).
        await operatorTripAPI.update(editingTrip.id, {
          trip_date: form.trip_date,
          departure_time: form.departure_time,
          current_fare: form.current_fare,
        });
        toast.success('Trip updated');
      } else {
        await operatorTripAPI.create(form);
        toast.success('Trip created');
      }
      setShowModal(false);
      setEditingTrip(null);
      setForm({ bus_id: 0, route_id: 0, trip_date: '', departure_time: '', current_fare: 0, available_seats: 30 });
      loadTrips();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try { await operatorTripAPI.updateStatus(id, status); toast.success('Status updated'); loadTrips(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Cancel this trip? This cannot be undone.')) return;
    try {
      await operatorTripAPI.delete(id);
      toast.success('Trip cancelled');
      loadTrips();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openEdit = (trip: TripItem) => {
    setEditingTrip(trip);
    setForm({
      bus_id: trip.bus?.id || 0,
      route_id: trip.route?.id || 0,
      trip_date: trip.trip_date,
      departure_time: trip.departure_time,
      current_fare: trip.current_fare,
      available_seats: trip.available_seats,
    });
    setShowModal(true);
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    BOARDING: 'bg-amber-100 text-amber-700',
    DEPARTED: 'bg-purple-100 text-purple-700',
    ARRIVED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  const stats = {
    total: summary.total,
    scheduled: summary.scheduled,
    boarding: summary.boarding,
    completed: summary.arrived,
    cancelled: summary.cancelled,
  };

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Trips</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your scheduled trips</p>
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
            onClick={() => { setEditingTrip(null); setForm({ bus_id: 0, route_id: 0, trip_date: '', departure_time: '', current_fare: 0, available_seats: 30 }); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Trip
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Trips</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Boarding</p>
          <p className="text-2xl font-bold text-amber-600">{stats.boarding}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Cancelled</p>
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by route, bus, or date..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); resetPage(); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="BOARDING">Boarding</option>
            <option value="DEPARTED">Departed</option>
            <option value="ARRIVED">Arrived</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date & Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Bus</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Fare</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Seats</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-1 text-gray-800 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {trip.trip_date}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {trip.departure_time}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-600 font-medium">{trip.route?.origin_city}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-red-600 font-medium">{trip.route?.destination_city}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Bus className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-800">{trip.bus?.bus_number}</span>
                      <span className="text-xs text-gray-500">({trip.bus?.bus_type})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-green-600">NPR {Number(trip.current_fare ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${trip.available_seats < 5 ? 'text-red-600' : 'text-gray-800'}`}>
                      {trip.available_seats}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {STATUS_TRANSITIONS[trip.status]?.length ? (
                        <select
                          value={trip.status}
                          onChange={(e) => handleStatusUpdate(trip.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          <option value={trip.status} disabled>{trip.status}</option>
                          {STATUS_TRANSITIONS[trip.status].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[trip.status] || 'bg-gray-100 text-gray-600'}`}>
                          {trip.status}
                        </span>
                      )}
                      <button onClick={() => openEdit(trip)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      {trip.status === 'SCHEDULED' && (
                        <button onClick={() => handleDelete(trip.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel trip">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No trips found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ServerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">{editingTrip ? 'Edit Trip' : 'Create Trip'}</h2>
              <button onClick={() => { setShowModal(false); setEditingTrip(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Bus *</label>
                {editingTrip ? (
                  <div className="w-full px-3 py-2.5 border border-dashed border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50">
                    {editingTrip.bus?.bus_number} ({editingTrip.bus?.bus_type}) — fixed after creation
                  </div>
                ) : (
                  <Dropdown
                    value={form.bus_id ? String(form.bus_id) : ''}
                    onChange={(val) => {
                      const bus = buses.find((b) => String(b.id) === val);
                      setForm({ ...form, bus_id: Number(val), available_seats: bus?.total_seats ?? form.available_seats });
                    }}
                    options={buses.map((b) => ({
                      value: String(b.id),
                      label: `${b.bus_number} - ${b.bus_type}`,
                    }))}
                    placeholder="Select Bus"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Route *</label>
                {editingTrip ? (
                  <div className="w-full px-3 py-2.5 border border-dashed border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50">
                    {editingTrip.route?.origin_city} → {editingTrip.route?.destination_city} — fixed after creation
                  </div>
                ) : (
                  <Dropdown
                    value={form.route_id ? String(form.route_id) : ''}
                    onChange={(val) => setForm({ ...form, route_id: Number(val) })}
                    options={routes.map((r) => ({
                      value: String(r.id),
                      label: `${r.origin_city} → ${r.destination_city}`,
                    }))}
                    placeholder="Select Route"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Trip Date *</label>
                <DatePicker
                  value={form.trip_date}
                  onChange={(val) => setForm({ ...form, trip_date: val })}
                  min={editingTrip ? undefined : TODAY_NPT}
                  placeholder="Select trip date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Departure Time *</label>
                <input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fare (NPR) *</label>
                <input type="number" placeholder="Fare in NPR" value={form.current_fare || ''} onChange={(e) => setForm({ ...form, current_fare: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" min={1} required />
              </div>
              {!editingTrip && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Available Seats *</label>
                  <input type="number" placeholder="Number of seats" value={form.available_seats} onChange={(e) => setForm({ ...form, available_seats: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" min={1} required />
                </div>
              )}
              <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                {editingTrip ? 'Update Trip' : 'Create Trip'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
