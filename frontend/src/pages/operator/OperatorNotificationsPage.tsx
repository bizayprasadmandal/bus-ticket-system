import { useState } from 'react';
import { Bell, AlertTriangle, Calendar, DollarSign, CheckCircle, Clock, Trash2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  type: 'cancellation' | 'low_occupancy' | 'schedule_change' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'cancellation',
    title: 'Booking Cancelled',
    description: 'Booking PNR-20240301-A1B2C3 has been cancelled by the customer. Route: Kathmandu → Pokhara on Mar 15, 2024.',
    timestamp: '2024-03-10T14:30:00Z',
    read: false,
  },
  {
    id: 2,
    type: 'low_occupancy',
    title: 'Low Occupancy Warning',
    description: 'Trip #456 (Kathmandu → Chitwan, Mar 18) has only 25% seats sold (5/20). Consider adjusting pricing or promotion.',
    timestamp: '2024-03-10T12:00:00Z',
    read: false,
  },
  {
    id: 3,
    type: 'payment',
    title: 'Payment Received',
    description: 'NPR 12,500 received for booking PNR-20240309-X9Y8Z7. Payment confirmed via eSewa.',
    timestamp: '2024-03-09T16:45:00Z',
    read: true,
  },
  {
    id: 4,
    type: 'schedule_change',
    title: 'Schedule Updated',
    description: 'Trip #789 departure time changed from 10:00 AM to 11:30 AM due to bus maintenance. Affected date: Mar 20, 2024.',
    timestamp: '2024-03-09T09:15:00Z',
    read: true,
  },
  {
    id: 5,
    type: 'cancellation',
    title: 'Booking Cancelled',
    description: 'Booking PNR-20240308-M4N5O6 has been cancelled. Route: Pokhara → Lumbini on Mar 22, 2024. Refund of NPR 3,200 processed.',
    timestamp: '2024-03-08T11:20:00Z',
    read: true,
  },
  {
    id: 6,
    type: 'low_occupancy',
    title: 'Low Occupancy Alert',
    description: 'Trip #321 (Lumbini → Kathmandu, Mar 25) has only 15% seats sold (3/20). Consider running promotions.',
    timestamp: '2024-03-08T08:00:00Z',
    read: false,
  },
  {
    id: 7,
    type: 'payment',
    title: 'Payment Received',
    description: 'NPR 8,750 received for booking PNR-20240307-P8Q9R0. Payment confirmed via Khalti.',
    timestamp: '2024-03-07T15:30:00Z',
    read: true,
  },
  {
    id: 8,
    type: 'schedule_change',
    title: 'Trip Added',
    description: 'New trip #450 (Kathmandu → Biratnagar) has been added for Mar 28, 2024 at 06:00 AM.',
    timestamp: '2024-03-07T10:00:00Z',
    read: true,
  },
];

const typeConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  cancellation: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
  low_occupancy: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  schedule_change: { icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  payment: { icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50' },
};

const typeFilters = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'cancellation', label: 'Cancellations', icon: AlertTriangle },
  { id: 'low_occupancy', label: 'Low Occupancy', icon: Clock },
  { id: 'schedule_change', label: 'Schedule', icon: Calendar },
  { id: 'payment', label: 'Payments', icon: DollarSign },
];

export default function OperatorNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<string>('all');

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    toast.success('Marked as read');
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notification deleted');
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification(s)` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#d84e55] bg-[#d84e55]/5 border border-[#d84e55]/20 rounded-lg hover:bg-[#d84e55]/10 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {typeFilters.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.id
                    ? 'bg-[#d84e55] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications to display</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;
            return (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-sm border p-4 transition-all hover:shadow-md ${
                  notification.read ? 'border-gray-100' : 'border-[#d84e55]/30 bg-[#d84e55]/[0.02]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 ${config.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-semibold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-[#d84e55] rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.description}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-[#d84e55] hover:underline font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
