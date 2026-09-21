import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, Search, ChevronLeft, ChevronRight, RefreshCw, ArrowUpRight, ArrowDownLeft, RotateCcw, CreditCard } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface WalletItem {
  id: number;
  user_name: string;
  user_phone: string;
  balance: number;
  last_transaction_date: string;
}

interface TransactionItem {
  id: number;
  user_name: string;
  user_phone: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

export default function AdminWalletsPage() {
  const [activeTab, setActiveTab] = useState<'wallets' | 'transactions'>('wallets');
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const loadWallets = useCallback(async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      const res = await api.get('/admin/wallets', { params });
      setWallets(res.data.data.items || []);
    } catch {
      toast.error('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const loadTransactions = useCallback(async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      const res = await api.get('/wallets/transactions', { params });
      setTransactions(res.data.data.transactions || res.data.data || []);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'wallets') {
      await loadWallets();
    } else {
      await loadTransactions();
    }
  }, [activeTab, loadWallets, loadTransactions]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadData, 30000);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredData = useMemo(() => {
    if (activeTab === 'wallets') return wallets;
    return transactions;
  }, [activeTab, wallets, transactions]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeTab]);

  const stats = useMemo(() => ({
    totalBalance: wallets.reduce((sum, w) => sum + (w.balance || 0), 0),
    totalTopUps: transactions.filter(t => t.type === 'TOP_UP').reduce((sum, t) => sum + (t.amount || 0), 0),
    totalTransfers: transactions.filter(t => t.type === 'TRANSFER').reduce((sum, t) => sum + (t.amount || 0), 0),
    totalRefunds: transactions.filter(t => t.type === 'REFUND').reduce((sum, t) => sum + (t.amount || 0), 0),
  }), [wallets, transactions]);

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'TOP_UP': return 'bg-green-100 text-green-700';
      case 'TRANSFER': return 'bg-blue-100 text-blue-700';
      case 'REFUND': return 'bg-purple-100 text-purple-700';
      case 'PAYMENT': return 'bg-amber-100 text-amber-700';
      case 'DEDUCTION': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'TOP_UP':
      case 'REFUND':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'TRANSFER':
      case 'PAYMENT':
      case 'DEDUCTION':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <RotateCcw className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Wallets</h1>
          <p className="text-sm text-gray-500 mt-1">Wallet and finance overview</p>
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
              <Wallet className="h-5 w-5 text-[#d84e55]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Balance</p>
              <p className="text-xl font-bold text-gray-800">NPR {stats.totalBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Top-ups</p>
              <p className="text-xl font-bold text-green-600">NPR {stats.totalTopUps.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Transfers</p>
              <p className="text-xl font-bold text-blue-600">NPR {stats.totalTransfers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Refunds</p>
              <p className="text-xl font-bold text-purple-600">NPR {stats.totalRefunds.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('wallets')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'wallets'
                  ? 'bg-[#d84e55] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Wallet className="h-4 w-4" />
              Wallets
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'transactions'
                  ? 'bg-[#d84e55] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Transactions
            </button>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'wallets' ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Balance</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Last Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(paginatedData as WalletItem[]).map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#d84e55]/10 rounded-full flex items-center justify-center">
                          <span className="text-[#d84e55] font-medium text-sm">
                            {wallet.user_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">{wallet.user_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{wallet.user_phone}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">NPR {wallet.balance?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {wallet.last_transaction_date
                        ? new Date(wallet.last_transaction_date).toLocaleString()
                        : 'No transactions'}
                    </td>
                  </tr>
                ))}
                {(paginatedData as WalletItem[]).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No wallets found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(paginatedData as TransactionItem[]).map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800">{tx.user_name}</p>
                        <p className="text-xs text-gray-400">{tx.user_phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(tx.type)}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(tx.type)}`}>
                          {tx.type?.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">NPR {tx.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{tx.description || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {(paginatedData as TransactionItem[]).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No transactions found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
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
