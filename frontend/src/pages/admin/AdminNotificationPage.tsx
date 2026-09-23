import { useState, useEffect, useCallback } from 'react';
import { Bell, Send, Search, ChevronLeft, ChevronRight, RefreshCw, Megaphone } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  target: string;
  priority: string;
  sent_at: string;
}

export default function AdminNotificationPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('ALL');
  const [priority, setPriority] = useState('MEDIUM');

  const itemsPerPage = 10;

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/admin/notifications', { params: { page: currentPage, limit: 20 } });
      setNotifications(res.data.data.items || res.data.data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadNotifications, 30000);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      n.message?.toLowerCase().includes(q) ||
      n.target?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      await api.post('/admin/notifications/announce', { title, message, target, priority });
      toast.success('Announcement sent successfully');
      setTitle('');
      setMessage('');
      setTarget('ALL');
      setPriority('MEDIUM');
      loadNotifications();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700';
      case 'NORMAL': return 'bg-blue-100 text-blue-700';
      case 'LOW': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTargetColor = (t: string) => {
    switch (t) {
      case 'ALL': return 'bg-[#d84e55]/10 text-[#d84e55]';
      case 'OPERATORS': return 'bg-purple-100 text-purple-700';
      case 'DRIVERS': return 'bg-green-100 text-green-700';
      case 'CUSTOMERS': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Send announcements and manage notification history</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-[#d84e55]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Send Announcement</h2>
            <p className="text-sm text-gray-500">Broadcast a message to platform users</p>
          </div>
        </div>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
                >
                  <option value="ALL">All Users</option>
                  <option value="OPERATORS">Operators</option>
                  <option value="DRIVERS">Drivers</option>
                  <option value="CUSTOMERS">Customers</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Write your announcement message here..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none resize-none"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="flex items-center gap-2 bg-[#d84e55] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#c4434a] transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium text-gray-700">Notification History</h3>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Message</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Target</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Priority</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Sent Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedNotifications.map((notification) => (
                <tr key={notification.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
                        <Bell className="h-4 w-4 text-[#d84e55]" />
                      </div>
                      <span className="font-medium text-gray-800">{notification.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{notification.message}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTargetColor(notification.target)}`}>
                      {notification.target}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {notification.sent_at
                      ? new Date(notification.sent_at).toLocaleString()
                      : '-'}
                  </td>
                </tr>
              ))}
              {paginatedNotifications.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No notifications sent yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} of {filteredNotifications.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-[#d84e55] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
