import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Camera,
  Calendar,
  Languages,
} from 'lucide-react';
import { authAPI, userAPI, walletAPI } from '../../api';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../../components/Avatar';
import toast from 'react-hot-toast';
import type { User as UserProfile } from '../../types';

const emptyForm = {
  full_name: '',
  full_name_nepali: '',
  email: '',
  gender: '',
  date_of_birth: '',
};

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [walletBalance, setWalletBalance] = useState(0);
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUser = profile || user;
  const photoUrl = photoPreview || displayUser?.profile_image_url || user?.profile_image_url;
  // /wallet renders the customer layout — hide the card for staff-only roles
  const canUseWallet = !(user?.roles?.length) || (user?.roles || []).some((r) => r.role === 'CUSTOMER' && r.is_active !== false);

  useEffect(() => {
    loadProfile();
    if (canUseWallet) loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyUserToStore = (next: UserProfile) => {
    setProfile(next);
    const merged: UserProfile = {
      ...(user as UserProfile),
      ...next,
      roles: next.roles?.length ? next.roles : user?.roles || [],
    };
    setUser(merged);
    setForm({
      full_name: next.full_name || '',
      full_name_nepali: next.full_name_nepali || '',
      email: next.email || '',
      gender: next.gender || '',
      date_of_birth: next.date_of_birth ? String(next.date_of_birth).slice(0, 10) : '',
    });
  };

  const loadProfile = async () => {
    try {
      const res = await userAPI.getProfile();
      applyUserToStore(res.data.data.user);
    } catch {
      if (user) {
        setForm({
          full_name: user.full_name || '',
          full_name_nepali: user.full_name_nepali || '',
          email: user.email || '',
          gender: user.gender || '',
          date_of_birth: user.date_of_birth ? String(user.date_of_birth).slice(0, 10) : '',
        });
      }
    }
  };

  const loadWallet = async () => {
    try {
      const res = await walletAPI.getBalance();
      setWalletBalance(Number(res.data.data.balance || 0));
    } catch {
      // Non-customer sessions have no wallet — leave at 0
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPhotoPreview(localPreview);
    setUploadingPhoto(true);
    try {
      const res = await userAPI.uploadPhoto(file);
      applyUserToStore(res.data.data.user);
      setPhotoPreview(null);
      toast.success('Profile photo updated');
    } catch (err: any) {
      setPhotoPreview(null);
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || form.full_name.trim().length < 2) {
      toast.error('Full name must be at least 2 characters');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await userAPI.updateProfile({
        full_name: form.full_name.trim(),
        full_name_nepali: form.full_name_nepali.trim() || null,
        email: form.email.trim() || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
      });
      applyUserToStore(res.data.data.user);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
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
      setIsChangingPassword(false);
    } catch (err: any) {
      toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = displayUser?.full_name
    ? displayUser.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-5">
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            My Profile
          </h1>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-100 p-5 mb-4"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md disabled:opacity-70"
                style={{
                  background: photoUrl ? '#eee' : 'linear-gradient(135deg, #d84e55, #e8687a)',
                  boxShadow: '0 4px 14px rgba(216,78,85,0.35)',
                }}
                aria-label="Change profile photo"
              >
                {photoUrl ? (
                  <Avatar
                    src={photoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    fallback={<span className="text-xl font-bold text-white">{initials}</span>}
                  />
                ) : (
                  <span className="text-xl font-bold text-white">{initials}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-gray-600 hover:text-[#d84e55] transition-colors"
                aria-label="Upload photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {displayUser?.full_name || '-'}
              </h2>
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Phone className="h-3.5 w-3.5" />
                {displayUser?.phone_number}
              </p>
              {uploadingPhoto && (
                <p className="text-xs mt-1" style={{ color: '#d84e55' }}>
                  Uploading photo…
                </p>
              )}
            </div>
          </div>
        </div>

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
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: '#d84e55' }}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="p-5 space-y-3">
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
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#d84e55]/30 focus:border-[#d84e55] transition-all"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Full Name (Nepali)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Languages className="h-4 w-4 text-gray-300" />
                  </div>
                  <input
                    type="text"
                    value={form.full_name_nepali}
                    onChange={(e) => setForm({ ...form, full_name_nepali: e.target.value })}
                    placeholder="Optional"
                    maxLength={100}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#d84e55]/30 focus:border-[#d84e55] transition-all"
                  />
                </div>
              </div>
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
                    value={displayUser?.phone_number || ''}
                    readOnly
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Phone number cannot be changed</p>
              </div>
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
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Not provided"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#d84e55]/30 focus:border-[#d84e55] transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#d84e55]/30 focus:border-[#d84e55] transition-all bg-white"
                  >
                    <option value="">Not set</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#d84e55]/30 focus:border-[#d84e55] transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#d84e55' }}
                >
                  <Save className="h-4 w-4" />
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setForm({
                      full_name: displayUser?.full_name || '',
                      full_name_nepali: displayUser?.full_name_nepali || '',
                      email: displayUser?.email || '',
                      gender: displayUser?.gender || '',
                      date_of_birth: displayUser?.date_of_birth
                        ? String(displayUser.date_of_birth).slice(0, 10)
                        : '',
                    });
                  }}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(216,78,85,0.08)' }}>
                    <User className="h-4 w-4" style={{ color: '#d84e55' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Name</p>
                    <p className="text-sm font-semibold text-gray-800">{displayUser?.full_name || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(216,78,85,0.08)' }}>
                    <Languages className="h-4 w-4" style={{ color: '#d84e55' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Name (Nepali)</p>
                    <p className="text-sm font-semibold text-gray-800">{displayUser?.full_name_nepali || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(216,78,85,0.08)' }}>
                    <Phone className="h-4 w-4" style={{ color: '#d84e55' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-semibold text-gray-800">{displayUser?.phone_number || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(216,78,85,0.08)' }}>
                    <Mail className="h-4 w-4" style={{ color: '#d84e55' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-gray-800">{displayUser?.email || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(216,78,85,0.08)' }}>
                    <Calendar className="h-4 w-4" style={{ color: '#d84e55' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Date of Birth</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {displayUser?.date_of_birth ? String(displayUser.date_of_birth).slice(0, 10) : '-'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(216,78,85,0.08)' }}>
                    <User className="h-4 w-4" style={{ color: '#d84e55' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Gender</p>
                    <p className="text-sm font-semibold text-gray-800">{displayUser?.gender || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {canUseWallet && (
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
              <button
                onClick={() => navigate('/wallet')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold text-white transition-all backdrop-blur-sm"
              >
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
        )}

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
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: '#d84e55' }}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Change
              </button>
            )}
          </div>

          {isChangingPassword ? (
            <form onSubmit={handlePasswordChange} className="p-5 space-y-3">
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
                    setIsChangingPassword(false);
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
                  onClick={() => setIsChangingPassword(true)}
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
