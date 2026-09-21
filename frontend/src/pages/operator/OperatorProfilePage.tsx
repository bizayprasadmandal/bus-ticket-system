import { useState, useEffect } from 'react';
import { User, Save, Loader2, Shield, MapPin, Phone, Mail, FileText, Percent } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

interface ProfileData {
  company_name: string;
  license_number: string;
  pan_number: string;
  vat_number: string;
  contact_person: string;
  phone_number: string;
  email: string;
  address: string;
  status: string;
  commission_rate: number;
}

const statusBadge: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

export default function OperatorProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/operators/profile');
      setProfile(res.data.data);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: string | number) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      await api.put('/operators/profile', profile);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Operator Profile</h1>
          <p className="text-sm text-gray-500 mt-1">View and update your company profile</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#d84e55] text-white rounded-lg hover:bg-[#c4434a] disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#d84e55]/10 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-[#d84e55]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{profile.company_name || 'Your Company'}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge[profile.status] || 'bg-gray-100 text-gray-600'}`}>
                {profile.status}
              </span>
              <span className="text-sm text-gray-500">
                Commission: {profile.commission_rate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-[#d84e55]" />
            <h3 className="text-lg font-semibold text-gray-800">Company Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={profile.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
              <input
                type="text"
                value={profile.license_number}
                onChange={(e) => handleChange('license_number', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={profile.pan_number}
                onChange={(e) => handleChange('pan_number', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
              <input
                type="text"
                value={profile.vat_number}
                onChange={(e) => handleChange('vat_number', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5" />
                  Commission Rate (%)
                </div>
              </label>
              <input
                type="number"
                value={profile.commission_rate}
                onChange={(e) => handleChange('commission_rate', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-[#d84e55]" />
            <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={profile.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  Phone Number
                </div>
              </label>
              <input
                type="tel"
                value={profile.phone_number}
                onChange={(e) => handleChange('phone_number', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Email Address
                </div>
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Address
                </div>
              </label>
              <textarea
                value={profile.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-[#d84e55]" />
          <h3 className="text-lg font-semibold text-gray-800">Account Status</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Current Status</p>
            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${statusBadge[profile.status] || 'bg-gray-100 text-gray-600'}`}>
              {profile.status}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Commission Rate</p>
            <p className="text-2xl font-bold text-[#d84e55] mt-1">{profile.commission_rate}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">License Number</p>
            <p className="text-lg font-bold text-gray-800 mt-1 font-mono">{profile.license_number || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
