import { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, Search, ChevronLeft, ChevronRight, RefreshCw, Calendar, CheckCircle, XCircle, DollarSign, Clock } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface RefundItem {
  id: number;
  booking_id: number;
  pnr: string;
  passenger_name: string;
  passenger_phone: string;
  refund_amount: number;
  reason: string;
  refund_status: string;
  requested_date: string;
  processed_date: string | null;
}

export default function AdminRefundPage() {
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<RefundItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const itemsPerPage = 10;

  const loadRefunds = useCallback(async () => {
    try {
      const params: any = { booking_status: 'CANCELLED', page: currentPage, limit: itemsPerPage };
      if (searchQuery) params.search = searchQuery;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      const res = await api.get('/admin/bookings', { params });
      const bookings = res.data.data.items || [];
      const pagination = res.data.data.pagination || {};
      setServerTotalPages(pagination.total_pages || 1);
      const refundsList: RefundItem[] = bookings
        .filter((b: any) => b.booking_status === 'CANCELLED')
        .map((b: any) => ({
          id: b.id,
          booking_id: b.id,
          pnr: b.pnr,
          passenger_name: b.user?.full_name || 'N/A',
          passenger_phone: b.user?.phone_number || '',
          refund_amount: Number(b.refund_amount || 0) || Number(b.total_amount || 0),
          reason: b.cancellation_reason || 'No reason provided',
          refund_status: b.payment_status === 'REFUNDED' ? 'REFUNDED' : (b.refund_amount ? 'APPROVED' : 'PENDING'),
          requested_date: b.booking_date || b.created_at,
          processed_date: b.payment_status === 'REFUNDED' ? (b.booking_date || b.created_at) : null,
        }));
      setRefunds(refundsList);
    } catch {
      toast.error('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, dateFrom, dateTo, currentPage]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadRefunds, 30000);

  useEffect(() => { loadRefunds(); }, [loadRefunds]);

  const filteredRefunds = useMemo(() => {
    if (statusFilter === 'ALL') return refunds;
    return refunds.filter(r => r.refund_status === statusFilter);
  }, [refunds, statusFilter]);

  const totalPages = statusFilter === 'ALL' ? serverTotalPages : Math.max(1, Math.ceil(filteredRefunds.length / itemsPerPage));
  const paginatedRefunds = statusFilter === 'ALL' ? refunds : filteredRefunds;

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => ({
    total: filteredRefunds.length,
    pending: filteredRefunds.filter(r => r.refund_status === 'PENDING'),
    approved: filteredRefunds.filter(r => r.refund_status === 'APPROVED'),
    refunded: filteredRefunds.filter(r => r.refund_status === 'REFUNDED'),
  }), [filteredRefunds]);

  const handleApprove = async (refund: RefundItem) => {
    setProcessingId(refund.id);
    try {
      await api.post(`/admin/bookings/${refund.booking_id}/refund`, {
        amount: refund.refund_amount,
        reason: refund.reason,
      });
      toast.success(`Refund approved for ${refund.pnr}`);
      loadRefunds();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve refund');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessingId(rejectModal.id);
    try {
      await api.post(`/admin/bookings/${rejectModal.booking_id}/refund/reject`, {
        reason: rejectReason,
      });
      toast.success(`Refund rejected for ${rejectModal.pnr}`);
      setRejectModal(null);
      setRejectReason('');
      loadRefunds();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject refund');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'APPROVED': return 'bg-blue-100 text-blue-700';
      case 'REFUNDED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={7} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Refunds</h1>
          <p className="text-sm text-gray-500 mt-1">Manage refund requests across the platform</p>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#d84e55]/10 rounded-lg flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-[#d84e55]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Refunds</p>
              <p className="text-xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Approved</p>
              <p className="text-xl font-bold text-blue-600">NPR {stats.approved.reduce((s, r) => s + r.refund_amount, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Refunded</p>
              <p className="text-xl font-bold text-green-600">NPR {stats.refunded.reduce((s, r) => s + r.refund_amount, 0).toLocaleString()}</p>
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
              placeholder="Search by PNR..."
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
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Refund ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Requested</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Processed</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedRefunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[#d84e55] font-medium">#{refund.id}</td>
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">{refund.pnr}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{refund.passenger_name}</p>
                      <p className="text-xs text-gray-400">{refund.passenger_phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">NPR {refund.refund_amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{refund.reason || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(refund.refund_status)}`}>
                      {refund.refund_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {refund.requested_date ? new Date(refund.requested_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {refund.processed_date ? new Date(refund.processed_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {refund.refund_status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(refund)}
                            disabled={processingId === refund.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {processingId === refund.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => { setRejectModal(refund); setRejectReason(''); }}
                            disabled={processingId === refund.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedRefunds.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No refunds found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, (currentPage - 1) * itemsPerPage + paginatedRefunds.length)} of {statusFilter === 'ALL' ? serverTotalPages * itemsPerPage : filteredRefunds.length}
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

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Reject Refund</h2>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to reject the refund for PNR <span className="font-mono font-medium text-[#d84e55]">{rejectModal.pnr}</span>?
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rejection Reason *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none resize-none"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setRejectModal(null); setRejectReason(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || processingId === rejectModal.id}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {processingId === rejectModal.id ? 'Rejecting...' : 'Reject Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
