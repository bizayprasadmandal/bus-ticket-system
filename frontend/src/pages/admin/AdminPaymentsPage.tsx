import { useState, useEffect, useCallback, useMemo } from 'react';
import { DollarSign, Search, ChevronLeft, ChevronRight, RefreshCw, Calendar, CreditCard, Clock, RotateCcw } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface PaymentItem {
  id: number;
  pnr: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const loadPayments = useCallback(async () => {
    try {
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (methodFilter !== 'ALL') params.payment_method = methodFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      const res = await api.get('/admin/payments', { params });
      const items = res.data.data.items || [];
      setPayments(items.map((p: any) => ({
        id: p.id,
        pnr: p.booking?.pnr || 'N/A',
        customer_name: p.booking?.user?.full_name || 'N/A',
        customer_phone: p.booking?.user?.phone_number || '',
        amount: Number(p.amount) || 0,
        payment_method: p.payment_method || '-',
        status: p.status,
        created_at: p.created_at,
      })));
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [methodFilter, statusFilter, dateFrom, dateTo, currentPage]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadPayments, 30000);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const filteredPayments = useMemo(() => payments, [payments]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [searchQuery, methodFilter, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => ({
    total: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    completed: payments.filter(p => p.status === 'SUCCESS' || p.status === 'COMPLETED' || p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0),
    pending: payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + (p.amount || 0), 0),
    refunded: payments.filter(p => p.status === 'REFUNDED' || p.status === 'CANCELLED').reduce((sum, p) => sum + (p.amount || 0), 0),
  }), [payments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'COMPLETED':
      case 'PAID': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'REFUNDED': return 'bg-purple-100 text-purple-700';
      case 'FAILED':
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'CASH': return 'bg-green-100 text-green-700';
      case 'ESEWA': return 'bg-blue-100 text-blue-700';
      case 'KHALTI': return 'bg-purple-100 text-purple-700';
      case 'WALLET': return 'bg-amber-100 text-amber-700';
      case 'CARD': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">All payment transactions across the platform</p>
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
              <DollarSign className="h-5 w-5 text-[#d84e55]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-gray-800">NPR {stats.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-xl font-bold text-green-600">NPR {stats.completed.toLocaleString()}</p>
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
              <p className="text-xl font-bold text-yellow-600">NPR {stats.pending.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Refunded</p>
              <p className="text-xl font-bold text-purple-600">NPR {stats.refunded.toLocaleString()}</p>
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
              placeholder="Search by PNR or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="ESEWA">eSewa</option>
            <option value="KHALTI">Khalti</option>
            <option value="WALLET">Wallet</option>
            <option value="CARD">Card</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="SUCCESS">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Payment ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Method</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-600">#{payment.id}</td>
                  <td className="px-4 py-3 font-mono text-[#d84e55] font-medium">{payment.pnr}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{payment.customer_name}</p>
                      <p className="text-xs text-gray-400">{payment.customer_phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">NPR {payment.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getMethodColor(payment.payment_method)}`}>
                      {payment.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {paginatedPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No payments found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length}
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
