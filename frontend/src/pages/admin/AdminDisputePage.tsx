import { useState, useMemo } from 'react';
import { AlertTriangle, Search, ChevronLeft, ChevronRight, Plus, Eye, MessageSquare, Filter, XCircle } from 'lucide-react';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface DisputeItem {
  id: number;
  customer_name: string;
  customer_phone: string;
  booking_pnr: string;
  type: 'complaint' | 'refund_request' | 'service_issue';
  subject: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  resolution_notes: string;
  created_at: string;
  updated_at: string;
}

export default function AdminDisputePage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const itemsPerPage = 10;

  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      const matchSearch = !searchQuery ||
        d.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.booking_pnr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      const matchType = typeFilter === 'ALL' || d.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [disputes, searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredDisputes.length / itemsPerPage);
  const paginatedDisputes = filteredDisputes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => ({
    total: disputes.length,
    open: disputes.filter(d => d.status === 'OPEN').length,
    investigating: disputes.filter(d => d.status === 'INVESTIGATING').length,
    resolved: disputes.filter(d => d.status === 'RESOLVED').length,
  }), [disputes]);

  const handleInvestigate = (dispute: DisputeItem) => {
    setDisputes(prev => prev.map(d =>
      d.id === dispute.id
        ? { ...d, status: 'INVESTIGATING' as const, updated_at: new Date().toISOString() }
        : d
    ));
    toast.success(`Dispute #${dispute.id} set to Investigating`);
  };

  const handleResolve = () => {
    if (!selectedDispute) return;
    setDisputes(prev => prev.map(d =>
      d.id === selectedDispute.id
        ? { ...d, status: 'RESOLVED' as const, resolution_notes: resolutionNotes, updated_at: new Date().toISOString() }
        : d
    ));
    toast.success(`Dispute #${selectedDispute.id} resolved`);
    setSelectedDispute(null);
    setResolutionNotes('');
  };

  const addTestDispute = () => {
    const newDispute: DisputeItem = {
      id: Date.now(),
      customer_name: 'Ram Bahadur',
      customer_phone: '9841000000',
      booking_pnr: `PNR${String(Math.floor(Math.random() * 9000) + 1000)}`,
      type: ['complaint', 'refund_request', 'service_issue'][Math.floor(Math.random() * 3)] as any,
      subject: 'Bus was delayed by 2 hours',
      description: 'The bus scheduled for 10:00 AM departure did not arrive until 12:00 PM. No communication was provided about the delay.',
      status: 'OPEN',
      resolution_notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDisputes(prev => [newDispute, ...prev]);
    toast.success('Test dispute created');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-700';
      case 'INVESTIGATING': return 'bg-yellow-100 text-yellow-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'complaint': return 'bg-orange-100 text-orange-700';
      case 'refund_request': return 'bg-purple-100 text-purple-700';
      case 'service_issue': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Disputes</h1>
          <p className="text-sm text-gray-500 mt-1">Customer complaint and dispute resolution</p>
        </div>
        <button
          onClick={addTestDispute}
          className="flex items-center gap-2 bg-[#d84e55] text-white px-4 py-2 rounded-lg hover:bg-[#c4434a] transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Test Dispute
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-[#d84e55]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Disputes</p>
              <p className="text-xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Open</p>
              <p className="text-xl font-bold text-red-600">{stats.open}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Eye className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Investigating</p>
              <p className="text-xl font-bold text-yellow-600">{stats.investigating}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Filter className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Resolved</p>
              <p className="text-xl font-bold text-green-600">{stats.resolved}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, PNR, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Types</option>
            <option value="complaint">Complaint</option>
            <option value="refund_request">Refund Request</option>
            <option value="service_issue">Service Issue</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Updated</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedDisputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[#d84e55] font-medium">#{dispute.id}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{dispute.customer_name}</p>
                      <p className="text-xs text-gray-400">{dispute.customer_phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">{dispute.booking_pnr}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(dispute.type)}`}>
                      {dispute.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{dispute.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                      {dispute.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(dispute.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {dispute.status === 'OPEN' && (
                        <button
                          onClick={() => handleInvestigate(dispute)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Investigate
                        </button>
                      )}
                      {dispute.status === 'INVESTIGATING' && (
                        <button
                          onClick={() => { setSelectedDispute(dispute); setResolutionNotes(''); }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                        >
                          <Filter className="h-3.5 w-3.5" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedDisputes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No disputes found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredDisputes.length)} of {filteredDisputes.length}
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

      {selectedDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Resolve Dispute</h2>
              <button onClick={() => { setSelectedDispute(null); setResolutionNotes(''); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Dispute</p>
                <p className="font-mono font-medium text-[#d84e55]">#{selectedDispute.id} - {selectedDispute.subject}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Resolution Notes *</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Describe how this dispute was resolved..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none resize-none"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setSelectedDispute(null); setResolutionNotes(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolutionNotes.trim()}
                  className="flex-1 bg-[#d84e55] text-white py-2.5 rounded-lg font-medium hover:bg-[#c4434a] transition-colors disabled:opacity-50"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
