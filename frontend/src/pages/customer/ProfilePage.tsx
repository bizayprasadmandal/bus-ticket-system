import { useState, useEffect } from 'react';
import { User, Phone, Mail, Save, Wallet, Edit3, Shield } from 'lucide-react';
import { authAPI, walletAPI } from '../../api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [walletBalance, setWalletBalance] = useState(0);
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const res = await walletAPI.getBalance();
      setWalletBalance(res.data.data.balance || 0);
    } catch {}
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      toast.success('Password changed successfully');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6" style={{ fontFamily: 'var(--font-heading)' }}>My Profile</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-600/20">
              <span className="text-2xl font-bold text-white">{user?.full_name?.charAt(0) || 'U'}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user?.full_name || '-'}</h2>
              <p className="text-sm text-gray-500">{user?.phone_number}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Full Name</p>
              <p className="font-semibold text-gray-800">{user?.full_name || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Phone Number</p>
              <p className="font-semibold text-gray-800">{user?.phone_number || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email</p>
              <p className="font-semibold text-gray-800">{user?.email || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Balance */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 mb-6 text-white shadow-lg shadow-primary-600/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg">Samaya Wallet</span>
        </div>
        <p className="text-primary-100 text-sm mb-1">Available Balance</p>
        <p className="text-4xl font-bold">NPR {walletBalance.toLocaleString()}</p>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <Shield className="h-5 w-5 text-primary-500" />
            Security
          </h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Change
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
              <input
                type="password"
                placeholder="Enter current password"
                value={passwords.current_password}
                onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white"
                minLength={6}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={changingPassword}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/25"
              >
                <Save className="h-4 w-4" />
                {changingPassword ? 'Saving...' : 'Save Password'}
              </button>
              <button
                type="button"
                onClick={() => { setIsEditing(false); setPasswords({ current_password: '', new_password: '', confirm_password: '' }); }}
                className="px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500">Your password was last changed recently. Click "Change" to update it.</p>
        )}
      </div>
    </div>
  );
}
