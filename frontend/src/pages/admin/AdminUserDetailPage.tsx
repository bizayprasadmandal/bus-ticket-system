import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Shield, Calendar, Ticket, Wallet, Loader2, ChevronDown, X } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../../components/Skeleton';

interface UserDetail {
  id: number;
  full_name: string;
  email?: string;
  phone_number: string;
  gender?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  roles?: { role: string; is_active: boolean }[];
  total_bookings?: number;
  total_spent?: number;
  wallet_balance?: number;
  recent_bookings?: BookingItem[];
}

interface BookingItem {
  id: number;
  pnr: string;
  trip?: { route?: { origin_city: string; destination_city: string } };
  total_amount: number;
  booking_status: string;
  created_at: string;
}

interface WalletTransaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface WalletData {
  balance: number;
  transactions: WalletTransaction[];
}

type TabKey = 'overview' | 'bookings' | 'wallet';

const ALL_ROLES = ['OPERATOR', 'DRIVER', 'CONDUCTOR', 'DISPATCHER', 'COUNTER_AGENT'];

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [addingRole, setAddingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const res = await api.get(`/admin/users/${id}`);
      setUser(res.data.data.user || res.data.data);
    } catch {
      try {
        const res = await api.get('/admin/users', { params: { search: id } });
        const found = (res.data.data.users || []).find((u: UserDetail) => String(u.id) === String(id));
        if (found) {
          setUser(found);
        } else {
          toast.error('User not found');
        }
      } catch {
        toast.error('Failed to load user details');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const res = await api.get('/admin/bookings', { params: { user_id: id } });
      setBookings(res.data.data.bookings || res.data.data || []);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setBookingsLoading(false);
    }
  }, [id]);

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await api.get('/admin/wallets', { params: { user_id: id } });
      setWallet(res.data.data);
    } catch {
      toast.error('Failed to load wallet data');
    } finally {
      setWalletLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'bookings' && bookings.length === 0 && !bookingsLoading) loadBookings();
    if (activeTab === 'wallet' && !wallet && !walletLoading) loadWallet();
  }, [activeTab, loadBookings, loadWallet, bookings.length, wallet, bookingsLoading, walletLoading]);

  const handleAddRole = async () => {
    if (!selectedRole) return;
    setAddingRole(true);
    try {
      await api.put(`/admin/users/${id}/roles`, { role: selectedRole });
      toast.success('Role added');
      setSelectedRole('');
      loadUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add role');
    } finally {
      setAddingRole(false);
    }
  };

  const handleRemoveRole = async (role: string) => {
    if (!confirm(`Remove role "${role.replace('_', ' ')}"?`)) return;
    try {
      await api.delete(`/admin/users/${id}/roles/${role}`);
      toast.success('Role removed');
      loadUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove role');
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-700';
      case 'OPERATOR':
        return 'bg-blue-100 text-blue-700';
      case 'DRIVER':
        return 'bg-orange-100 text-orange-700';
      case 'CONDUCTOR':
        return 'bg-teal-100 text-teal-700';
      case 'DISPATCHER':
        return 'bg-amber-100 text-amber-700';
      case 'COUNTER_AGENT':
        return 'bg-indigo-100 text-indigo-700';
      case 'CUSTOMER':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof Ticket }[] = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'bookings', label: 'Bookings', icon: Ticket },
    { key: 'wallet', label: 'Wallet', icon: Wallet },
  ];

  const availableRoles = ALL_ROLES.filter(
    (r) => !user?.roles?.some((ur) => ur.role === r)
  );

  if (loading) return <TableSkeleton rows={4} cols={4} />;
  if (!user) return <div className="text-center py-12 text-gray-500">User not found</div>;

  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#d84e55] transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-16 h-16 bg-[#d84e55]/10 rounded-full flex items-center justify-center">
            <span className="text-[#d84e55] font-bold text-xl">{getUserInitials(user.full_name || 'U')}</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">{user.full_name}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" /> {user.phone_number}
              </div>
              {user.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" /> {user.email}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="h-4 w-4 text-gray-400" /> {user.gender || 'Not specified'}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" /> Joined {new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {user.roles?.map((r) => (
                <span key={r.role} className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(r.role)}`}>
                  {r.role.replace('_', ' ')}
                </span>
              ))}
              {(!user.roles || user.roles.length === 0) && <span className="text-xs text-gray-400">No roles assigned</span>}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Bookings</p>
                  <p className="text-lg font-bold text-gray-800">{user.total_bookings ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-[#d84e55]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Spent</p>
                  <p className="text-lg font-bold text-gray-800">NPR {(user.total_spent || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Wallet Balance</p>
                  <p className="text-lg font-bold text-gray-800">NPR {(user.wallet_balance || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Bookings</h3>
            {user.recent_bookings && user.recent_bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">PNR</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Route</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Amount</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {user.recent_bookings.slice(0, 5).map((b) => (
                      <tr key={b.id}>
                        <td className="px-3 py-2 font-mono text-xs">{b.pnr}</td>
                        <td className="px-3 py-2 text-gray-600">{b.trip?.route?.origin_city} → {b.trip?.route?.destination_city}</td>
                        <td className="px-3 py-2 font-medium">NPR {b.total_amount?.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            b.booking_status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                            b.booking_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            b.booking_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{b.booking_status}</span>
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

      {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {bookingsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-[#d84e55]" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{b.pnr}</td>
                      <td className="px-4 py-3 text-gray-600">{b.trip?.route?.origin_city} → {b.trip?.route?.destination_city}</td>
                      <td className="px-4 py-3 font-medium">NPR {b.total_amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          b.booking_status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                          b.booking_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          b.booking_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{b.booking_status}</span>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center"><Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No bookings found</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {walletLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-[#d84e55]" /></div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <p className="text-sm text-gray-500">Wallet Balance</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">NPR {(wallet?.balance || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {wallet?.transactions && wallet.transactions.length > 0 ? (
                        wallet.transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                t.type === 'CREDIT' || t.type === 'DEPOSIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>{t.type}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{t.description}</td>
                            <td className={`px-4 py-3 font-medium ${t.type === 'CREDIT' || t.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === 'CREDIT' || t.type === 'DEPOSIT' ? '+' : '-'}NPR {t.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} className="px-4 py-12 text-center"><Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No transactions found</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Role Assignment Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Role Assignment</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {user.roles?.map((r) => (
            <span key={r.role} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getRoleBadgeColor(r.role)}`}>
              {r.role.replace('_', ' ')}
              <button onClick={() => handleRemoveRole(r.role)} className="hover:opacity-70 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {availableRoles.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="appearance-none pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
              >
                <option value="">Select role...</option>
                {availableRoles.map((r) => (
                  <option key={r} value={r}>{r.replace('_', ' ')}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={handleAddRole}
              disabled={!selectedRole || addingRole}
              className="px-4 py-2 bg-[#d84e55] text-white rounded-lg text-sm font-medium hover:bg-[#c44349] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingRole ? 'Adding...' : 'Add Role'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
