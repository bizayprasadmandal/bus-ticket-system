import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { adminUserAPI } from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface UserItem {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  roles?: { role: string }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await adminUserAPI.getAll();
      setUsers(res.data.data.users || []);
    } catch { toast.error('Failed to load users'); } finally { setLoading(false); }
  };

  const toggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await adminUserAPI.updateStatus(userId, !currentStatus);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      loadUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Users</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> {user.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{user.phone_number}</td>
                <td className="px-4 py-3 text-gray-600">{user.email || '-'}</td>
                <td className="px-4 py-3">
                  {user.roles?.map((r) => (
                    <span key={r.role} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium mr-1">{r.role}</span>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(user.id, user.is_active)}
                    className={`text-xs px-3 py-1 rounded-lg ${user.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
