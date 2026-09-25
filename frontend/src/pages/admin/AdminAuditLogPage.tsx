import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, RefreshCw } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import ServerPagination from '../../components/ServerPagination';
import toast from 'react-hot-toast';

interface AuditEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
}

export default function AdminAuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const itemsPerPage = 20;

  const loadEntries = useCallback(async () => {
    try {
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (entityFilter !== 'ALL') params.entity_type = entityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      const res = await api.get('/admin/audit-log', { params });
      const data = res.data.data || {};
      setEntries(data.items || []);
      setTotalPages(data.pagination?.total_pages || 1);
      setTotalItems(data.pagination?.total_items || (data.items || []).length);
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [currentPage, actionFilter, entityFilter, searchQuery, dateFrom, dateTo]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadEntries, 30000, true, false);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('CREATED') || action.includes('ASSIGNED') || action.includes('SENT')) return 'bg-green-100 text-green-700';
    if (action.includes('DELETE') || action.includes('REMOVED') || action.includes('REJECT')) return 'bg-red-100 text-red-700';
    if (action.includes('UPDATE') || action.includes('UPDATED') || action.includes('SUSPEND') || action.includes('APPROV')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getEntityColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'OPERATOR': return 'bg-purple-100 text-purple-700';
      case 'USER':
      case 'USER_ROLE': return 'bg-blue-100 text-blue-700';
      case 'BOOKING':
      case 'PAYMENT': return 'bg-[#d84e55]/10 text-[#d84e55]';
      case 'SYSTEM':
      case 'SETTINGS': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={7} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#d84e55]" /> Audit Log
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track admin actions and system changes</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user or details..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="REFUND">Refund</option>
            <option value="SUSPEND">Suspend / Activate</option>
            <option value="ANNOUNCE">Announce</option>
            <option value="SETTINGS">Settings</option>
            <option value="PROMO">Promo</option>
            <option value="DISPUTE">Dispute</option>
          </select>
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Entities</option>
            <option value="USER">User</option>
            <option value="OPERATOR">Operator</option>
            <option value="BOOKING">Booking</option>
            <option value="SYSTEM">System</option>
            <option value="PROMO_CODE">Promo</option>
            <option value="DISPUTE">Dispute</option>
            <option value="ANNOUNCEMENT">Announcement</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
            />
          </div>
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {lastUpdated && (
          <p className="mt-2 text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Entity Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Entity ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Details</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{entry.user}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(entry.action)}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getEntityColor(entry.entity_type)}`}>
                      {entry.entity_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">{entry.entity_id}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{entry.details}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{entry.ip_address}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No audit entries found</p>
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
    </div>
  );
}
