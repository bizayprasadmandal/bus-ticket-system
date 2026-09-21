import { useState, useMemo } from 'react';
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from '../../components/Skeleton';

interface AuditEntry {
  id: number;
  timestamp: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: 'operator' | 'user' | 'booking' | 'settings';
  entity_id: string;
  details: string;
  ip_address: string;
}

const sampleData: AuditEntry[] = [
  { id: 1, timestamp: '2026-09-22T10:30:00Z', user: 'admin@gadi.com', action: 'CREATE', entity_type: 'operator', entity_id: 'OP-1042', details: 'Created new operator account for Himalayan Express', ip_address: '192.168.1.100' },
  { id: 2, timestamp: '2026-09-22T09:15:00Z', user: 'admin@gadi.com', action: 'UPDATE', entity_type: 'user', entity_id: 'USR-5021', details: 'Suspended user account for policy violation', ip_address: '192.168.1.100' },
  { id: 3, timestamp: '2026-09-21T16:45:00Z', user: 'supervisor@gadi.com', action: 'UPDATE', entity_type: 'booking', entity_id: 'BK-88234', details: 'Approved refund of NPR 1,500 for cancelled booking', ip_address: '192.168.1.105' },
  { id: 4, timestamp: '2026-09-21T14:20:00Z', user: 'admin@gadi.com', action: 'UPDATE', entity_type: 'settings', entity_id: 'CFG-001', details: 'Modified platform commission rate from 5% to 7%', ip_address: '192.168.1.100' },
  { id: 5, timestamp: '2026-09-20T11:00:00Z', user: 'admin@gadi.com', action: 'DELETE', entity_type: 'operator', entity_id: 'OP-0987', details: 'Removed inactive operator - Mountain Travels', ip_address: '192.168.1.100' },
  { id: 6, timestamp: '2026-09-20T09:30:00Z', user: 'supervisor@gadi.com', action: 'CREATE', entity_type: 'operator', entity_id: 'OP-1043', details: 'Created new operator account for Valley Transport', ip_address: '192.168.1.105' },
  { id: 7, timestamp: '2026-09-19T15:10:00Z', user: 'admin@gadi.com', action: 'UPDATE', entity_type: 'user', entity_id: 'USR-3412', details: 'Changed user role from PASSENGER to OPERATOR_ADMIN', ip_address: '192.168.1.100' },
  { id: 8, timestamp: '2026-09-19T12:00:00Z', user: 'admin@gadi.com', action: 'CREATE', entity_type: 'settings', entity_id: 'CFG-002', details: 'Added new holiday surcharge configuration', ip_address: '192.168.1.100' },
];

export default function AdminAuditLogPage() {
  const [loading] = useState(false);
  const [entries] = useState<AuditEntry[]>(sampleData);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 8;

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (actionFilter !== 'ALL') result = result.filter(e => e.action === actionFilter);
    if (entityFilter !== 'ALL') result = result.filter(e => e.entity_type === entityFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.user.toLowerCase().includes(q) || e.details.toLowerCase().includes(q));
    }
    if (dateFrom) result = result.filter(e => new Date(e.timestamp) >= new Date(dateFrom));
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(e => new Date(e.timestamp) <= to);
    }
    return result;
  }, [entries, actionFilter, entityFilter, searchQuery, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700';
      case 'UPDATE': return 'bg-blue-100 text-blue-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getEntityColor = (type: string) => {
    switch (type) {
      case 'operator': return 'bg-purple-100 text-purple-700';
      case 'user': return 'bg-blue-100 text-blue-700';
      case 'booking': return 'bg-[#d84e55]/10 text-[#d84e55]';
      case 'settings': return 'bg-yellow-100 text-yellow-700';
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
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Entities</option>
            <option value="operator">Operator</option>
            <option value="user">User</option>
            <option value="booking">Booking</option>
            <option value="settings">Settings</option>
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
        </div>
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
              {paginatedEntries.map((entry) => (
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
              {paginatedEntries.length === 0 && (
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEntries.length)} of {filteredEntries.length}
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
