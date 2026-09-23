import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, Mail, Calendar, Bus, Route, Ticket, TrendingUp, Users, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../../components/Skeleton';
import { bookingStatusLabel } from '../../utils/statusLabels';

interface OperatorDetail {
  id: number;
  company_name: string;
  company_name_nepali?: string;
  contact_person: string;
  contact_phone: string;
  email?: string;
  status: string;
  commission_rate?: number;
  created_at: string;
  total_buses?: number;
  total_routes?: number;
  total_bookings?: number;
  total_revenue?: number;
  recent_bookings?: BookingItem[];
}

interface BusItem {
  id: number;
  bus_number: string;
  model: string;
  type: string;
  total_seats: number;
  status: string;
}

interface BookingItem {
  id: number;
  pnr: string;
  user?: { full_name: string };
  trip?: { route?: { origin_city: string; destination_city: string } };
  total_amount: number;
  booking_status: string;
  created_at: string;
}

interface RevenueData {
  total_revenue: number;
  monthly_revenue?: { month: string; revenue: number }[];
}

interface StaffItem {
  id: number;
  full_name: string;
  phone_number: string;
  role: string;
}

type TabKey = 'overview' | 'buses' | 'revenue' | 'staff';

export default function AdminOperatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [operator, setOperator] = useState<OperatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [buses, setBuses] = useState<BusItem[]>([]);
  const [busesLoading, setBusesLoading] = useState(false);

  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    loadOperator();
  }, [id]);

  const loadOperator = async () => {
    try {
      const res = await api.get(`/admin/operators/${id}`);
      setOperator(res.data.data.operator || res.data.data);
    } catch {
      toast.error('Failed to load operator details');
    } finally {
      setLoading(false);
    }
  };

  const loadBuses = useCallback(async () => {
    setBusesLoading(true);
    try {
      const res = await api.get('/buses', { params: { operator_id: id } });
      setBuses(res.data.data.buses || res.data.data || []);
    } catch {
      toast.error('Failed to load buses');
    } finally {
      setBusesLoading(false);
    }
  }, [id]);

  const loadRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const res = await api.get('/reports/revenue', { params: { operator_id: id } });
      setRevenue(res.data.data);
    } catch {
      toast.error('Failed to load revenue data');
    } finally {
      setRevenueLoading(false);
    }
  }, [id]);

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const res = await api.get('/operators/staff', { params: { operator_id: id } });
      setStaff(res.data.data.staff || res.data.data || []);
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setStaffLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'buses' && buses.length === 0 && !busesLoading) loadBuses();
    if (activeTab === 'revenue' && !revenue && !revenueLoading) loadRevenue();
    if (activeTab === 'staff' && staff.length === 0 && !staffLoading) loadStaff();
  }, [activeTab, loadBuses, loadRevenue, loadStaff, buses.length, staff.length, revenue, busesLoading, revenueLoading, staffLoading]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'INACTIVE':
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof Bus }[] = [
    { key: 'overview', label: 'Overview', icon: Building2 },
    { key: 'buses', label: 'Buses', icon: Bus },
    { key: 'revenue', label: 'Revenue', icon: TrendingUp },
    { key: 'staff', label: 'Staff', icon: Users },
  ];

  if (loading) return <TableSkeleton rows={4} cols={4} />;
  if (!operator) return <div className="text-center py-12 text-gray-500">Operator not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/admin/operators" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#d84e55] transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Operators
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-14 h-14 bg-[#d84e55]/10 rounded-xl flex items-center justify-center">
            <Building2 className="h-7 w-7 text-[#d84e55]" />
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">{operator.company_name}</h1>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(operator.status)}`}>
                {operator.status}
              </span>
            </div>
            {operator.company_name_nepali && <p className="text-sm text-gray-500 mb-3">{operator.company_name_nepali}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4 text-gray-400" /> {operator.contact_person}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" /> {operator.contact_phone}
              </div>
              {operator.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" /> {operator.email}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" /> Joined {new Date(operator.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm text-gray-500">Commission Rate: </span>
              <span className="text-sm font-semibold text-gray-800">{operator.commission_rate || 10}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-[#d84e55] text-[#d84e55]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Buses', value: operator.total_buses ?? 0, icon: Bus, color: 'text-blue-600', bgColor: 'bg-blue-50' },
              { label: 'Total Routes', value: operator.total_routes ?? 0, icon: Route, color: 'text-green-600', bgColor: 'bg-green-50' },
              { label: 'Total Bookings', value: operator.total_bookings ?? 0, icon: Ticket, color: 'text-purple-600', bgColor: 'bg-purple-50' },
              { label: 'Total Revenue', value: `NPR ${(operator.total_revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-[#d84e55]', bgColor: 'bg-[#d84e55]/10' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{card.label}</p>
                      <p className="text-lg font-bold text-gray-800">{card.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Bookings</h3>
            {operator.recent_bookings && operator.recent_bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">PNR</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Customer</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Route</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Amount</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {operator.recent_bookings.slice(0, 5).map((b) => (
                      <tr key={b.id}>
                        <td className="px-3 py-2 font-mono text-xs">{b.pnr}</td>
                        <td className="px-3 py-2">{b.user?.full_name || 'N/A'}</td>
                        <td className="px-3 py-2 text-gray-600">{b.trip?.route?.origin_city} → {b.trip?.route?.destination_city}</td>
                        <td className="px-3 py-2 font-medium">NPR {b.total_amount?.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            b.booking_status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                            b.booking_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            b.booking_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{bookingStatusLabel(b.booking_status)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Ticket className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No recent bookings</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'buses' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {busesLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-[#d84e55]" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Bus Number</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Model</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Seats</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {buses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{bus.bus_number}</td>
                      <td className="px-4 py-3 text-gray-600">{bus.model}</td>
                      <td className="px-4 py-3 text-gray-600">{bus.type}</td>
                      <td className="px-4 py-3 text-gray-600">{bus.total_seats}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(bus.status)}`}>{bus.status}</span>
                      </td>
                    </tr>
                  ))}
                  {buses.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center"><Bus className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No buses found</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {revenueLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-[#d84e55]" /></div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">NPR {(revenue?.total_revenue || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Revenue</h3>
                {revenue?.monthly_revenue && revenue.monthly_revenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={revenue.monthly_revenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => `NPR ${Number(v ?? 0).toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#d84e55" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No revenue data available</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {staffLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-[#d84e55]" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staff.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{s.full_name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.phone_number}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{s.role}</span>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-12 text-center"><Users className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No staff found</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
