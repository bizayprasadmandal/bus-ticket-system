import { useState, useEffect, useCallback } from 'react';
import { Wallet, Search, RefreshCw, ArrowUpRight, ArrowDownLeft, RotateCcw, CreditCard } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import ServerPagination from '../../components/ServerPagination';
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

interface PageMeta {
  totalPages: number;
  totalItems: number;
}

export default function AdminWalletsPage() {
  const [activeTab, setActiveTab] = useState<'wallets' | 'transactions'>('wallets');
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [walletPage, setWalletPage] = useState<PageMeta>({ totalPages: 1, totalItems: 0 });
  const [txnPage, setTxnPage] = useState<PageMeta>({ totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [walletCurrentPage, setWalletCurrentPage] = useState(1);
  const [txnCurrentPage, setTxnCurrentPage] = useState(1);

  const itemsPerPage = 20;

  const loadWallets = useCallback(async (page: number, search: string) => {
    try {
      const params: any = { page, limit: itemsPerPage };
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/admin/wallets', { params });
      const data = res.data.data || {};
      const rawItems = data.items || [];
      setWallets(rawItems.map((w: any) => ({
        id: w.id,
        user_name: w.user?.full_name || w.user_name || '',
        user_phone: w.user?.phone_number || w.user_phone || '',
        balance: parseFloat(w.balance || 0),
        last_transaction_date: w.updated_at || w.last_transaction_date || null,
      })));
      setWalletPage({
        totalPages: data.pagination?.total_pages || 1,
        totalItems: data.pagination?.total_items || rawItems.length,
      });
    } catch {
      toast.error('Failed to load wallets');
    }
  }, []);

  const loadTransactions = useCallback(async (page: number, search: string) => {
    try {
      const params: any = { page, limit: itemsPerPage };
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/admin/wallets/transactions', { params });
      const data = res.data.data || {};
      const txns = data.items || data.transactions || [];
      setTransactions(txns.map((t: any) => ({
        id: t.id,
        user_name: t.user_name || t.user?.full_name || '',
        user_phone: t.user_phone || t.user?.phone_number || '',
        type: t.type || t.transaction_type || 'UNKNOWN',
        amount: parseFloat(t.amount || 0),
        description: t.description || '',
        created_at: t.created_at || t.createdAt || '',
      })));
      setTxnPage({
        totalPages: data.pagination?.total_pages || 1,
        totalItems: data.pagination?.total_items || txns.length,
      });
    } catch {
      setTransactions([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadWallets(walletCurrentPage, searchQuery),
      loadTransactions(txnCurrentPage, searchQuery),
    ]);
    setLoading(false);
  }, [loadWallets, loadTransactions, walletCurrentPage, txnCurrentPage, searchQuery]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadData, 30000, true, false);

  useEffect(() => { loadData(); }, [loadData]);

  const currentMeta = activeTab === 'wallets' ? walletPage : txnPage;
  const currentSetters = activeTab === 'wallets' ? { list: wallets, page: walletCurrentPage, setPage: setWalletCurrentPage } : { list: transactions, page: txnCurrentPage, setPage: setTxnCurrentPage };

  const stats = {
    totalBalance: wallets.reduce((sum, w) => sum + (w.balance || 0), 0),
    totalTopUps: transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + (t.amount || 0), 0),
    totalTransfers: transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + (t.amount || 0), 0),
    totalRefunds: transactions.filter(t => t.type === 'CREDIT' && /refund/i.test(t.description || '')).reduce((sum, t) => sum + (t.amount || 0), 0),
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'CREDIT':
      case 'TOP_UP':
      case 'REFUND':
        return 'bg-green-100 text-green-700';
      case 'DEBIT':
      case 'TRANSFER':
      case 'PAYMENT':
      case 'DEDUCTION':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CREDIT':
      case 'TOP_UP':
      case 'REFUND':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'DEBIT':
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
              onClick={() => { setActiveTab('wallets'); setWalletCurrentPage(1); }}
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
              onClick={() => { setActiveTab('transactions'); setTxnCurrentPage(1); }}
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setWalletCurrentPage(1);
                setTxnCurrentPage(1);
              }}
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
                {wallets.map((wallet) => (
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
                {wallets.length === 0 && (
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
                {transactions.map((tx) => (
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
                {transactions.length === 0 && (
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

        <ServerPagination
          currentPage={currentSetters.page}
          totalPages={currentMeta.totalPages}
          totalItems={currentMeta.totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={currentSetters.setPage}
        />
      </div>
    </div>
  );
}
