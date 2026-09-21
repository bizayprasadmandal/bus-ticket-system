import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletAPI } from '../../api';

interface WalletBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

export default function WalletPage() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('esewa');
  const [loading, setLoading] = useState(true);
  const [toppingUp, setToppingUp] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await walletAPI.getBalance();
      setBalance(res.data.data || res.data);
    } catch {
      toast.error('Failed to load wallet balance');
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await walletAPI.getTransactions({ limit: 20 });
      setTransactions(res.data.data?.transactions || res.data.transactions || []);
    } catch {
      toast.error('Failed to load transactions');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchBalance(), fetchTransactions()]);
      setLoading(false);
    };
    load();
  }, [fetchBalance, fetchTransactions]);

  const handleTopUp = async () => {
    const amount = topUpAmount || Number(customAmount);
    if (!amount || amount <= 0) {
      toast.error('Please select or enter an amount');
      return;
    }
    setToppingUp(true);
    try {
      await walletAPI.topUp(amount, paymentMethod);
      toast.success(`NPR ${amount} top-up initiated`);
      setTopUpAmount(0);
      setCustomAmount('');
      await Promise.all([fetchBalance(), fetchTransactions()]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Top-up failed');
    } finally {
      setToppingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-[#d84e55]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
          My Wallet
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage your wallet balance and transactions</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#d84e55]/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-[#d84e55]" />
            </div>
            <span className="text-sm text-gray-500">Current Balance</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">NPR {balance?.balance?.toLocaleString() ?? '0'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Total Earned</span>
          </div>
          <p className="text-2xl font-bold text-green-600">NPR {balance?.total_earned?.toLocaleString() ?? '0'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-sm text-gray-500">Total Spent</span>
          </div>
          <p className="text-2xl font-bold text-red-500">NPR {balance?.total_spent?.toLocaleString() ?? '0'}</p>
        </div>
      </div>

      {/* Top-up Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Up Wallet</h2>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Select Amount</label>
          <div className="grid grid-cols-4 gap-3 mb-3">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => { setTopUpAmount(amt); setCustomAmount(''); }}
                className={`py-2.5 rounded-lg border-2 font-semibold transition-all ${
                  topUpAmount === amt
                    ? 'border-[#d84e55] bg-[#d84e55]/5 text-[#d84e55]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                NPR {amt.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">NPR</span>
            <input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setTopUpAmount(0); }}
              className="w-full pl-14 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#d84e55]/20 focus:border-[#d84e55] outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
          <div className="flex gap-3">
            {[
              { id: 'esewa', label: 'eSewa', icon: Smartphone },
              { id: 'khalti', label: 'Khalti', icon: Smartphone },
              { id: 'wallet', label: 'Wallet', icon: CreditCard },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                  paymentMethod === method.id
                    ? 'border-[#d84e55] bg-[#d84e55]/5 text-[#d84e55]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <method.icon className="h-4 w-4" />
                {method.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleTopUp}
          disabled={toppingUp || (!topUpAmount && !customAmount)}
          className="w-full bg-[#d84e55] text-white py-2.5 rounded-lg font-semibold hover:bg-[#c44349] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {toppingUp ? 'Processing...' : 'Top Up Wallet'}
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    tx.type === 'CREDIT' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {tx.type === 'CREDIT' ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'CREDIT' ? '+' : '-'}NPR {tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
