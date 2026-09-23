import { useState, useEffect } from 'react';
import { Settings, Save, X, Edit3, CreditCard, Bell, Truck } from 'lucide-react';
import api from '../../api';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface PlatformSettings {
  service_fee_percent: number;
  tax_rate_percent: number;
  currency: string;
  platform_name: string;
}

interface BookingSettings {
  seat_lock_timeout_minutes: number;
  max_passengers_per_booking: number;
  auto_cancel_timeout_minutes: number;
}

interface PaymentSettings {
  khalti_enabled: boolean;
  esewa_enabled: boolean;
  cash_enabled: boolean;
  default_payment_method: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
}

interface SettingsData {
  platform: PlatformSettings;
  booking: BookingSettings;
  payment: PaymentSettings;
  notification: NotificationSettings;
}

const defaultSettings: SettingsData = {
  platform: {
    service_fee_percent: 5,
    tax_rate_percent: 13,
    currency: 'NPR',
    platform_name: 'Gadi Ticket',
  },
  booking: {
    seat_lock_timeout_minutes: 10,
    max_passengers_per_booking: 10,
    auto_cancel_timeout_minutes: 30,
  },
  payment: {
    khalti_enabled: true,
    esewa_enabled: true,
    cash_enabled: true,
    default_payment_method: 'Khalti',
  },
  notification: {
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
  },
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<SettingsData>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      const s = res.data?.data?.settings || res.data?.data || {};
      setSettings({
        platform: {
          service_fee_percent: s.service_fee ?? defaultSettings.platform.service_fee_percent,
          tax_rate_percent: s.tax_rate ?? defaultSettings.platform.tax_rate_percent,
          currency: s.currency ?? defaultSettings.platform.currency,
          platform_name: s.platform_name ?? defaultSettings.platform.platform_name,
        },
        booking: {
          seat_lock_timeout_minutes: s.seat_lock_timeout ?? defaultSettings.booking.seat_lock_timeout_minutes,
          max_passengers_per_booking: s.max_passengers ?? defaultSettings.booking.max_passengers_per_booking,
          auto_cancel_timeout_minutes: s.auto_cancel_timeout ?? defaultSettings.booking.auto_cancel_timeout_minutes,
        },
        payment: {
          khalti_enabled: s.payment_methods?.khalti ?? defaultSettings.payment.khalti_enabled,
          esewa_enabled: s.payment_methods?.esewa ?? defaultSettings.payment.esewa_enabled,
          cash_enabled: s.payment_methods?.cash ?? defaultSettings.payment.cash_enabled,
          default_payment_method: s.default_payment
            ? s.default_payment.charAt(0).toUpperCase() + s.default_payment.slice(1).toLowerCase()
            : defaultSettings.payment.default_payment_method,
        },
        notification: {
          email_notifications: s.notifications?.email ?? defaultSettings.notification.email_notifications,
          sms_notifications: s.notifications?.sms ?? defaultSettings.notification.sms_notifications,
          push_notifications: s.notifications?.push ?? defaultSettings.notification.push_notifications,
        },
      });
    } catch {
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (section: string) => {
    setEditingSection(section);
    setEditValues({ ...settings });
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditValues({ ...settings });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        service_fee: editValues.platform.service_fee_percent,
        tax_rate: editValues.platform.tax_rate_percent,
        currency: editValues.platform.currency,
        platform_name: editValues.platform.platform_name,
        seat_lock_timeout: editValues.booking.seat_lock_timeout_minutes,
        max_passengers: editValues.booking.max_passengers_per_booking,
        auto_cancel_timeout: editValues.booking.auto_cancel_timeout_minutes,
        payment_methods: {
          khalti: editValues.payment.khalti_enabled,
          esewa: editValues.payment.esewa_enabled,
          cash: editValues.payment.cash_enabled,
        },
        default_payment: editValues.payment.default_payment_method.toLowerCase(),
        notifications: {
          email: editValues.notification.email_notifications,
          sms: editValues.notification.sms_notifications,
          push: editValues.notification.push_notifications,
        },
      };
      await api.put('/admin/settings', payload);
      setSettings({ ...editValues });
      setEditingSection(null);
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updatePlatform = (key: keyof PlatformSettings, value: any) => {
    setEditValues(prev => ({
      ...prev,
      platform: { ...prev.platform, [key]: value },
    }));
  };

  const updateBooking = (key: keyof BookingSettings, value: any) => {
    setEditValues(prev => ({
      ...prev,
      booking: { ...prev.booking, [key]: value },
    }));
  };

  const updatePayment = (key: keyof PaymentSettings, value: any) => {
    setEditValues(prev => ({
      ...prev,
      payment: { ...prev.payment, [key]: value },
    }));
  };

  const updateNotification = (key: keyof NotificationSettings, value: any) => {
    setEditValues(prev => ({
      ...prev,
      notification: { ...prev.notification, [key]: value },
    }));
  };

  if (loading) return <TableSkeleton rows={4} cols={2} />;

  const isEditing = (section: string) => editingSection === section;
  const vals = editValues;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">System configuration and platform settings</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
              <Truck className="h-5 w-5 text-[#d84e55]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Platform Settings</h2>
              <p className="text-sm text-gray-500">Basic platform configuration</p>
            </div>
          </div>
          {isEditing('platform') ? (
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#d84e55] text-white rounded-lg text-sm font-medium hover:bg-[#c4434a] transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEdit('platform')}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform Name</label>
            <input
              type="text"
              value={isEditing('platform') ? vals.platform.platform_name : settings.platform.platform_name}
              onChange={(e) => updatePlatform('platform_name', e.target.value)}
              disabled={!isEditing('platform')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
            <input
              type="text"
              value={isEditing('platform') ? vals.platform.currency : settings.platform.currency}
              onChange={(e) => updatePlatform('currency', e.target.value)}
              disabled={!isEditing('platform')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Fee (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={isEditing('platform') ? vals.platform.service_fee_percent : settings.platform.service_fee_percent}
              onChange={(e) => updatePlatform('service_fee_percent', Number(e.target.value))}
              disabled={!isEditing('platform')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={isEditing('platform') ? vals.platform.tax_rate_percent : settings.platform.tax_rate_percent}
              onChange={(e) => updatePlatform('tax_rate_percent', Number(e.target.value))}
              disabled={!isEditing('platform')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Booking Settings</h2>
              <p className="text-sm text-gray-500">Seat locks, limits, and auto-cancel</p>
            </div>
          </div>
          {isEditing('booking') ? (
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#d84e55] text-white rounded-lg text-sm font-medium hover:bg-[#c4434a] transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEdit('booking')}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Seat Lock Timeout (minutes)</label>
            <input
              type="number"
              min="1"
              value={isEditing('booking') ? vals.booking.seat_lock_timeout_minutes : settings.booking.seat_lock_timeout_minutes}
              onChange={(e) => updateBooking('seat_lock_timeout_minutes', Number(e.target.value))}
              disabled={!isEditing('booking')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Passengers Per Booking</label>
            <input
              type="number"
              min="1"
              max="50"
              value={isEditing('booking') ? vals.booking.max_passengers_per_booking : settings.booking.max_passengers_per_booking}
              onChange={(e) => updateBooking('max_passengers_per_booking', Number(e.target.value))}
              disabled={!isEditing('booking')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Auto-Cancel Timeout (minutes)</label>
            <input
              type="number"
              min="1"
              value={isEditing('booking') ? vals.booking.auto_cancel_timeout_minutes : settings.booking.auto_cancel_timeout_minutes}
              onChange={(e) => updateBooking('auto_cancel_timeout_minutes', Number(e.target.value))}
              disabled={!isEditing('booking')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Payment Settings</h2>
              <p className="text-sm text-gray-500">Payment methods and defaults</p>
            </div>
          </div>
          {isEditing('payment') ? (
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#d84e55] text-white rounded-lg text-sm font-medium hover:bg-[#c4434a] transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEdit('payment')}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">Khalti</p>
              <p className="text-xs text-gray-500">Digital wallet payment</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEditing('payment') ? vals.payment.khalti_enabled : settings.payment.khalti_enabled}
                onChange={(e) => updatePayment('khalti_enabled', e.target.checked)}
                disabled={!isEditing('payment')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#d84e55] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d84e55] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">eSewa</p>
              <p className="text-xs text-gray-500">Digital wallet payment</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEditing('payment') ? vals.payment.esewa_enabled : settings.payment.esewa_enabled}
                onChange={(e) => updatePayment('esewa_enabled', e.target.checked)}
                disabled={!isEditing('payment')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#d84e55] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d84e55] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">Cash</p>
              <p className="text-xs text-gray-500">Pay at boarding</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEditing('payment') ? vals.payment.cash_enabled : settings.payment.cash_enabled}
                onChange={(e) => updatePayment('cash_enabled', e.target.checked)}
                disabled={!isEditing('payment')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#d84e55] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d84e55] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Payment Method</label>
            <select
              value={isEditing('payment') ? vals.payment.default_payment_method : settings.payment.default_payment_method}
              onChange={(e) => updatePayment('default_payment_method', e.target.value)}
              disabled={!isEditing('payment')}
              className="w-full max-w-xs px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="Khalti">Khalti</option>
              <option value="eSewa">eSewa</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Notification Settings</h2>
              <p className="text-sm text-gray-500">Enable or disable notification channels</p>
            </div>
          </div>
          {isEditing('notification') ? (
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#d84e55] text-white rounded-lg text-sm font-medium hover:bg-[#c4434a] transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEdit('notification')}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">Email Notifications</p>
              <p className="text-xs text-gray-500">Send notifications via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEditing('notification') ? vals.notification.email_notifications : settings.notification.email_notifications}
                onChange={(e) => updateNotification('email_notifications', e.target.checked)}
                disabled={!isEditing('notification')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#d84e55] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d84e55] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">SMS Notifications</p>
              <p className="text-xs text-gray-500">Send notifications via SMS</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEditing('notification') ? vals.notification.sms_notifications : settings.notification.sms_notifications}
                onChange={(e) => updateNotification('sms_notifications', e.target.checked)}
                disabled={!isEditing('notification')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#d84e55] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d84e55] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Push Notifications</p>
              <p className="text-xs text-gray-500">Send push notifications to mobile devices</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEditing('notification') ? vals.notification.push_notifications : settings.notification.push_notifications}
                onChange={(e) => updateNotification('push_notifications', e.target.checked)}
                disabled={!isEditing('notification')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#d84e55] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d84e55] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
