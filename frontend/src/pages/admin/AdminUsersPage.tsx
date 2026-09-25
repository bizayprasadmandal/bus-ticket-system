import { useState, useEffect, useCallback } from 'react';
import { Users, Search, UserCheck, UserX, Shield, Phone, Mail, Calendar, Eye } from 'lucide-react';
import { adminUserAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import ServerPagination from '../../components/ServerPagination';
import toast from 'react-hot-toast';

interface UserItem {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  gender?: string;
  status: string;
  is_phone_verified?: boolean;
  created_at: string;
  roles?: { role: string; is_active: boolean }[];
}

interface UserStats {
  total: number;
  active: number;
  suspended: number;
  customers: number;
  operators: number;
  admins: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const itemsPerPage = 20;

  const fetchUsers = useCallback(async (page: number, search: string, role: string, status: string) => {
    try {
      const params: Record<string, unknown> = { page, limit: itemsPerPage };
      if (search.trim()) params.search = search.trim();
      if (status !== 'ALL') params.status = status;
      if (role !== 'ALL') params.role = role;

      const res = await adminUserAPI.getAll(params);
      const data = res.data?.data || {};
      setUsers(data.users || []);
      setStats(data.stats || null);
      if (data.pagination) {
        setTotalPages(data.pagination.total_pages || 1);
        setTotalItems(data.pagination.total_items || 0);
      } else {
        setTotalPages(1);
        setTotalItems((data.users || []).length);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, searchQuery, roleFilter, statusFilter);
  }, [fetchUsers, currentPage, searchQuery, roleFilter, statusFilter]);

  const toggleStatus = async (userId: number, currentStatus: string) => {
    try {
      await adminUserAPI.updateStatus(userId, currentStatus !== 'ACTIVE');
      toast.success(`User ${currentStatus === 'ACTIVE' ? 'suspended' : 'activated'}`);
      fetchUsers(currentPage, searchQuery, roleFilter, statusFilter);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-700';
      case 'OPERATOR':
        return 'bg-blue-100 text-blue-700';
      case 'CUSTOMER':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage user accounts and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-800">{stats?.total ?? totalItems}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats?.active ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Suspended</p>
          <p className="text-2xl font-bold text-red-600">{stats?.suspended ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Customers</p>
          <p className="text-2xl font-bold text-blue-600">{stats?.customers ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Operators</p>
          <p className="text-2xl font-bold text-purple-600">{stats?.operators ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Admins</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.admins ?? 0}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="ALL">All Roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="OPERATOR">Operator</option>
            <option value="SUPER_ADMIN">Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-sm">{getUserInitials(user.full_name || 'U')}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.full_name}</p>
                        <p className="text-xs text-gray-400">{user.gender || 'Not specified'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {user.phone_number}
                      </div>
                      {user.email && (
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {user.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((r) => (
                        <span key={r.role} className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(r.role)}`}>
                          {r.role.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`text-xs font-medium ${user.status === 'ACTIVE' ? 'text-green-700' : 'text-red-700'}`}>
                        {user.status === 'ACTIVE' ? 'Active' : user.status === 'SUSPENDED' ? 'Suspended' : 'Deleted'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(user.id, user.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          user.status === 'ACTIVE'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No users found</p>
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

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">User Details</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">{getUserInitials(selectedUser.full_name || 'U')}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{selectedUser.full_name}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.email || 'No email'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-sm font-medium text-gray-800">{selectedUser.phone_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Gender</p>
                  <p className="text-sm font-medium text-gray-800">{selectedUser.gender || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${selectedUser.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedUser.status === 'ACTIVE' ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                    {selectedUser.status === 'ACTIVE' ? 'Active' : selectedUser.status === 'SUSPENDED' ? 'Suspended' : 'Deleted'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Verified</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${selectedUser.is_phone_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    <Shield className="h-3 w-3" />
                    {selectedUser.is_phone_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.roles?.map((r) => (
                    <span key={r.role} className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(r.role)}`}>
                      {r.role.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">Member since {new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
