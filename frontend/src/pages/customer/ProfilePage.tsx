import { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Save,
  Wallet,
  Edit3,
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react';
import { authAPI, walletAPI } from '../../api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [walletBalance, setWalletBalance] = useState(0);
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

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

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            My Profile
          </h1>
        </div>

        {/* Profile Header Card */}
        <div
          className="bg-white rounded-xl border border-gray-100 p-5 mb-4"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar with initials */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
              style={{
                background: 'linear-gradient(135deg, #d84e55, #e8687a)',
                boxShadow: '0 4px 14px rgba(216,78,85,0.35)',
              }}
            >
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {user?.full_name || '-'}
              </h2>
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Phone className="h-3.5 w-3.5" />
                {user?.phone_number}
              </p>
            </div>
          </div>
        </div>

        {/* My Profile Section */}
        <div
          className="bg-white rounded-xl border border-gray-100 mb-4"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
            <h3
              className="text-sm font-bold text-gray-800"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              My Profile
            </h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: '#d84e55' }}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="p-5 space-y-3">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-300" />
                  </div>
                  <input
                    type="text"
                    value={user?.full_name || ''}
                    readOnly
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50"
                  />
                </div>
              </div>
              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-300" />
                  </div>
                  <input
                    type="text"
                    value={user?.phone_number || ''}
                    readOnly
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50"
                  />
                </div>
              </div>
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-300" />
                  </div>
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    placeholder="Not provided"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50"
                  />
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="w-full py-2.5 text-sm font-bold text-white rounded-lg transition-all"
                style={{ backgroundColor: '#d84e55' }}
              >
                Done
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(216,78,85,0.08)' }}>
                    <User className="h-4 w-4" style={{ color: '#d84e55' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Name</p>
                    <p className="text-sm font-semibold text-gray-800">{user?.full_name || '-'}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(216,78,85,0.08)' }}>
                    <Phone className="h-4 w-4" style={{ color: '#d84e55' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-semibold text-gray-800">{user?.phone_number || '-'}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(216,78,85,0.08)' }}>
                    <Mail className="h-4 w-4" style={{ color: '#d84e55' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-gray-800">{user?.email || 'Not provided'}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            </div>
          )}
        </div>

        {/* Wallet Section */}
        <div
          className="rounded-xl overflow-hidden mb-4"
          style={{
            background: 'linear-gradient(135deg, #d84e55, #f4845f)',
            boxShadow: '0 4px 14px rgba(216,78,85,0.3)',
          }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Wallet className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="text-sm font-bold text-white/90">Wallet Balance</span>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold text-white transition-all backdrop-blur-sm">
                Top Up
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <p className="text-3xl font-extrabold text-white">
              NPR {walletBalance.toLocaleString()}
            </p>
            <p className="text-xs text-white/60 mt-1">Available for bookings</p>
          </div>
        </div>

        {/* Change Password Section */}
        <div
          className="bg-white rounded-xl border border-gray-100"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: '#d84e55' }} />
              <h3
                className="text-sm font-bold text-gray-800"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Change Password
              </h3>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: '#d84e55' }}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Change
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handlePasswordChange} className="p-5 space-y-3">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={passwords.current_password}
                    onChange={(e) =>
                      setPasswords({ ...passwords, current_password: e.target.value })
                    }
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/30 focus:border-[#d84e55] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-300 hover:text-gray-500"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={passwords.new_password}
                    onChange={(e) =>
                      setPasswords({ ...passwords, new_password: e.target.value })
                    }
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/30 focus:border-[#d84e55] transition-all"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-300 hover:text-gray-500"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwords.confirm_password}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm_password: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55]/30 focus:border-[#d84e55] transition-all"
                  minLength={6}
                  required
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#d84e55' }}
                >
                  <Save className="h-4 w-4" />
                  {changingPassword ? 'Saving...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setPasswords({ current_password: '', new_password: '', confirm_password: '' });
                  }}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="px-5 py-4">
              <p className="text-sm text-gray-400">
                Your password is secured. Click{' '}
                <button
                  onClick={() => setIsEditing(true)}
                  className="font-semibold hover:underline"
                  style={{ color: '#d84e55' }}
                >
                  Change
                </button>{' '}
                to update it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
