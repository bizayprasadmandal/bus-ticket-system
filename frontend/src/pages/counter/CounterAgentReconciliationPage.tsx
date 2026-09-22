import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Banknote, Ticket, TrendingDown, TrendingUp, Printer, Loader2, RefreshCw } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

const sanitize = (str: string) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

interface ReconciliationData {
  total_collected: number;
  total_bookings: number;
  total_refunds: number;
  net_collection: number;
  cash_payments: CashPayment[];
  cancellations: Cancellation[];
}

interface CashPayment {
  id: number;
  created_at: string;
  pnr: string;
  route: string;
  passengers: number;
  amount: number;
}

interface Cancellation {
  id: number;
  created_at: string;
  pnr: string;
  amount: number;
}

export default function CounterAgentReconciliationPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingDate, setChangingDate] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/bookings/counter/reconciliation', { params: { date } });
      setData(res.data.data);
    } catch {
      toast.error('Failed to load reconciliation data');
    } finally {
      setLoading(false);
      setChangingDate(false);
    }
  }, [date]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleDateChange = (newDate: string) => {
    setChangingDate(true);
    setDate(newDate);
  };

  const handlePrintReport = () => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const paymentRows = data.cash_payments
      ?.map(
        (p, i) =>
          `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(new Date(p.created_at).toLocaleTimeString())}</td><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(p.pnr)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(p.route)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(String(p.passengers))}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">NPR ${sanitize(p.amount.toLocaleString())}</td></tr>`
      )
      .join('') || '';
    const cancellationRows = data.cancellations
      ?.map(
        (c) =>
          `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(new Date(c.created_at).toLocaleTimeString())}</td><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(c.pnr)}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">NPR ${sanitize(c.amount.toLocaleString())}</td></tr>`
      )
      .join('') || '';
    printWindow.document.write(`
      <html><head><title>Reconciliation Report - ${date}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .report { max-width: 700px; margin: 0 auto; }
        h1 { color: #d84e55; border-bottom: 2px solid #d84e55; padding-bottom: 8px; }
        h2 { color: #555; font-size: 16px; margin-top: 20px; }
        .summary { display: flex; gap: 16px; margin: 16px 0; }
        .summary-card { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; }
        .summary-card .label { font-size: 12px; color: #666; }
        .summary-card .value { font-size: 20px; font-weight: bold; color: #d84e55; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
        th { background: #f3f4f6; padding: 6px 8px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
        .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
      </style></head><body>
      <div class="report">
        <h1>Cash Reconciliation Report</h1>
        <p><strong>Date:</strong> ${sanitize(date)}</p>
        <div class="summary">
          <div class="summary-card"><div class="label">Total Collected</div><div class="value">NPR ${data.total_collected.toLocaleString()}</div></div>
          <div class="summary-card"><div class="label">Total Bookings</div><div class="value">${data.total_bookings}</div></div>
          <div class="summary-card"><div class="label">Total Refunds</div><div class="value">NPR ${data.total_refunds.toLocaleString()}</div></div>
          <div class="summary-card"><div class="label">Net Collection</div><div class="value">NPR ${data.net_collection.toLocaleString()}</div></div>
        </div>
        <h2>Cash Payments (${data.cash_payments?.length || 0})</h2>
        <table>
          <thead><tr><th>Time</th><th>PNR</th><th>Route</th><th>Passengers</th><th style="text-align:right;">Amount</th></tr></thead>
          <tbody>${paymentRows || '<tr><td colspan="5" style="padding:8px;text-align:center;color:#999;">No cash payments</td></tr>'}</tbody>
        </table>
        <h2>Cancellations (${data.cancellations?.length || 0})</h2>
        <table>
          <thead><tr><th>Time</th><th>PNR</th><th style="text-align:right;">Amount</th></tr></thead>
          <tbody>${cancellationRows || '<tr><td colspan="3" style="padding:8px;text-align:center;color:#999;">No cancellations</td></tr>'}</tbody>
        </table>
        <div class="footer">Generated by Gadi Yatra Counter Agent Panel</div>
      </div>
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  if (changingDate && data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Cash Reconciliation</h1>
            <p className="text-sm text-gray-500 mt-1">End-of-day cash reconciliation report.</p>
          </div>
        </div>
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  const summaryCards = [
    { label: 'Total Collected', value: `NPR ${(data?.total_collected || 0).toLocaleString()}`, icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Bookings', value: data?.total_bookings || 0, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Refunds', value: `NPR ${(data?.total_refunds || 0).toLocaleString()}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Net Collection', value: `NPR ${(data?.net_collection || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-[#d84e55]', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cash Reconciliation</h1>
          <p className="text-sm text-gray-500 mt-1">End-of-day cash reconciliation report.</p>
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

      {/* Date Picker */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#d84e55]" />
            <label className="text-sm font-medium text-gray-700">Date</label>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
          />
          <button
            onClick={handlePrintReport}
            className="ml-auto px-4 py-2 bg-[#d84e55] text-white text-sm font-bold rounded-lg hover:bg-[#c4424a] transition-colors flex items-center gap-2 btn-press"
          >
            <Printer className="h-4 w-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow card-hover">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cash Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Cash Payments ({data?.cash_payments?.length || 0})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Passengers</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.cash_payments?.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">{new Date(payment.created_at).toLocaleTimeString()}</td>
                  <td className="px-4 py-3">
                    <Link to={`/counter/lookup?pnr=${payment.pnr}`} className="font-mono font-medium text-[#d84e55] hover:underline">{payment.pnr}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{payment.route}</td>
                  <td className="px-4 py-3 text-gray-600">{payment.passengers}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">NPR {payment.amount.toLocaleString()}</td>
                </tr>
              ))}
              {(!data?.cash_payments || data.cash_payments.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Banknote className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No cash payments for this date</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Cancellations ({data?.cancellations?.length || 0})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">PNR</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.cancellations?.map((cancel) => (
                <tr key={cancel.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">{new Date(cancel.created_at).toLocaleTimeString()}</td>
                  <td className="px-4 py-3">
                    <Link to={`/counter/lookup?pnr=${cancel.pnr}`} className="font-mono font-medium text-[#d84e55] hover:underline">{cancel.pnr}</Link>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">NPR {cancel.amount.toLocaleString()}</td>
                </tr>
              ))}
              {(!data?.cancellations || data.cancellations.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center">
                    <TrendingDown className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No cancellations for this date</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
