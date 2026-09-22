import { useState, useCallback } from 'react';
import { Search, Phone, Ticket, MapPin, Calendar, Clock, Users, Printer, X, Loader2, ChevronDown } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import toast from 'react-hot-toast';

interface BookingDetail {
  id: number;
  pnr: string;
  total_passengers: number;
  base_amount: number;
  tax_amount: number;
  service_fee: number;
  total_amount: number;
  payment_status: string;
  booking_status: string;
  created_at: string;
  trip?: {
    trip_date: string;
    departure_time: string;
    arrival_time?: string;
    route?: { origin_city: string; destination_city: string; distance_km?: number };
    bus?: { bus_number: string; bus_type: string; total_seats?: number };
  };
  user?: { full_name: string; phone_number: string };
  passengers?: { passenger_name: string; seat_number: string; phone_number?: string; age?: number; gender?: string }[];
}

interface LookupHistoryItem {
  query: string;
  mode: 'pnr' | 'phone';
  timestamp: Date;
}

export default function CounterAgentPNRPage() {
  const [searchMode, setSearchMode] = useState<'pnr' | 'phone'>('pnr');
  const [pnrInput, setPnrInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<BookingDetail | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<LookupHistoryItem[]>([]);
  const [cancelling, setCancelling] = useState(false);

  const addHistory = (query: string, mode: 'pnr' | 'phone') => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => !(h.query === query && h.mode === mode));
      return [{ query, mode, timestamp: new Date() }, ...filtered].slice(0, 10);
    });
  };

  const searchByPNR = useCallback(async (pnr?: string) => {
    const query = pnr || pnrInput.trim();
    if (!query) {
      toast.error('Please enter a PNR number');
      return;
    }
    setSearching(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/bookings/verify-pnr/${query}`);
      setResult(res.data.data.booking || res.data.data);
      addHistory(query, 'pnr');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Booking not found');
      toast.error('Booking not found');
    } finally {
      setSearching(false);
    }
  }, [pnrInput]);

  const searchByPhone = useCallback(async (phone?: string) => {
    const query = phone || phoneInput.trim();
    if (!query) {
      toast.error('Please enter a phone number');
      return;
    }
    setSearching(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get('/bookings', { params: { search: query } });
      const bookings = res.data.data.bookings || res.data.data;
      if (Array.isArray(bookings) && bookings.length > 0) {
        setResult(bookings[0]);
      } else {
        setError('No bookings found for this phone number');
      }
      addHistory(query, 'phone');
    } catch (err: any) {
      setError(err.response?.data?.message || 'No bookings found');
      toast.error('No bookings found');
    } finally {
      setSearching(false);
    }
  }, [phoneInput]);

  const handleSearch = () => {
    if (searchMode === 'pnr') searchByPNR();
    else searchByPhone();
  };

  const handleCancel = async () => {
    if (!result) return;
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      await api.post(`/bookings/${result.id}/cancel`, { cancellation_reason: 'Counter agent cancellation' });
      setResult((prev) => prev ? { ...prev, booking_status: 'CANCELLED' } : null);
      toast.success('Booking cancelled successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const pnr = result.pnr;
    const route = `${result.trip?.route?.origin_city} → ${result.trip?.route?.destination_city}`;
    const passengerRows = result.passengers
      ?.map(
        (p, i) =>
          `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${i + 1}</td><td style="padding:4px 8px;border:1px solid #ddd;">${p.passenger_name}</td><td style="padding:4px 8px;border:1px solid #ddd;">${p.seat_number}</td><td style="padding:4px 8px;border:1px solid #ddd;">${p.phone_number || '-'}</td></tr>`
      )
      .join('') || '';
    printWindow.document.write(`
      <html><head><title>Ticket - ${pnr}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .ticket { max-width: 400px; margin: 0 auto; border: 2px solid #d84e55; padding: 16px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px dashed #d84e55; padding-bottom: 12px; margin-bottom: 12px; }
        .header h1 { margin: 0; color: #d84e55; font-size: 22px; }
        .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .info-row span:first-child { color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
        th { background: #f3f4f6; padding: 4px 8px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
        .total { text-align: right; font-size: 18px; font-weight: bold; color: #d84e55; margin-top: 8px; border-top: 2px solid #d84e55; padding-top: 8px; }
        .stamp { text-align: center; margin: 12px 0; }
        .stamp span { display: inline-block; border: 3px solid ${result.payment_status === 'PAID' ? '#16a34a' : '#f59e0b'}; color: ${result.payment_status === 'PAID' ? '#16a34a' : '#f59e0b'}; font-size: 16px; font-weight: bold; padding: 4px 16px; border-radius: 4px; transform: rotate(-5deg); }
      </style></head><body>
      <div class="ticket">
        <div class="header"><h1>Gadi Yatra</h1></div>
        <div class="info-row"><span>PNR</span><strong>${pnr}</strong></div>
        <div class="info-row"><span>Route</span><strong>${route}</strong></div>
        <div class="info-row"><span>Date</span><strong>${result.trip?.trip_date}</strong></div>
        <div class="info-row"><span>Time</span><strong>${result.trip?.departure_time}</strong></div>
        <div class="info-row"><span>Bus</span><strong>${result.trip?.bus?.bus_type} (${result.trip?.bus?.bus_number})</strong></div>
        <table><thead><tr><th>#</th><th>Passenger</th><th>Seat</th><th>Phone</th></tr></thead><tbody>${passengerRows}</tbody></table>
        <div class="total">Total: NPR ${result.total_amount?.toLocaleString()}</div>
        <div class="stamp"><span>${result.payment_status === 'PAID' ? 'PAID - CASH' : result.booking_status}</span></div>
      </div>
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const statusColors: Record<string, string> = {
    CONFIRMED: 'bg-green-100 text-green-700',
    PENDING: 'bg-amber-100 text-amber-700',
    CANCELLED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">PNR / Phone Lookup</h1>
        <p className="text-sm text-gray-500 mt-1">Search for bookings by PNR number or passenger phone.</p>
      </div>

      {/* Search Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setSearchMode('pnr'); setResult(null); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              searchMode === 'pnr' ? 'bg-[#d84e55] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Ticket className="h-4 w-4" /> PNR Lookup
          </button>
          <button
            onClick={() => { setSearchMode('phone'); setResult(null); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              searchMode === 'phone' ? 'bg-[#d84e55] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Phone className="h-4 w-4" /> Phone Lookup
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-3">
          {searchMode === 'pnr' ? (
            <input
              type="text"
              placeholder="Enter PNR number (e.g. ABC123)"
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          ) : (
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          )}
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-6 py-2.5 bg-[#d84e55] text-white text-sm font-bold rounded-lg hover:bg-[#c4424a] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && !result && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <X className="h-10 w-10 text-red-400 mx-auto mb-2" />
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-red-500 mt-1">Try a different search term.</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-gray-500">PNR Number</p>
              <p className="text-2xl font-mono font-bold text-[#d84e55]">{result.pnr}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[result.booking_status] || 'bg-gray-100 text-gray-600'}`}>
                {result.booking_status}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${result.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {result.payment_status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Passenger Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">PASSENGER INFO</p>
              <p className="font-medium text-gray-800">{result.user?.full_name || 'Customer'}</p>
              <p className="text-sm text-gray-600">{result.user?.phone_number}</p>
            </div>

            {/* Trip Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">TRIP INFO</p>
              <div className="flex items-center gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 text-green-600" />
                <span className="font-medium">{result.trip?.route?.origin_city}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium">{result.trip?.route?.destination_city}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {result.trip?.trip_date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {result.trip?.departure_time}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{result.trip?.bus?.bus_type} ({result.trip?.bus?.bus_number})</p>
            </div>
          </div>

          {/* Passengers Table */}
          {result.passengers && result.passengers.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-2 font-medium">PASSENGERS ({result.passengers.length})</p>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Seat</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.passengers.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-600">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{p.passenger_name}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 bg-[#d84e55] text-white text-xs font-bold rounded">{p.seat_number}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{p.phone_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Fare Breakdown */}
          <div className="bg-amber-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 mb-2 font-medium">FARE BREAKDOWN</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Base Amount</span><span className="font-medium">NPR {result.base_amount?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tax (13%)</span><span className="font-medium">NPR {result.tax_amount?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Service Fee</span><span className="font-medium">NPR {result.service_fee?.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-[#d84e55] pt-1 border-t border-amber-200">
                <span>Total</span><span>NPR {result.total_amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-[#d84e55] text-white font-bold text-sm rounded-lg hover:bg-[#c4424a] transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" /> Print Ticket
            </button>
            {result.booking_status === 'CONFIRMED' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 border border-red-200 text-red-600 font-bold text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent Lookups */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Lookups</h3>
          <div className="space-y-2">
            {history.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  if (item.mode === 'pnr') { setPnrInput(item.query); setSearchMode('pnr'); }
                  else { setPhoneInput(item.query); setSearchMode('phone'); }
                }}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {item.mode === 'pnr' ? <Ticket className="h-4 w-4 text-[#d84e55]" /> : <Phone className="h-4 w-4 text-[#d84e55]" />}
                  <div>
                    <span className="text-sm font-medium text-gray-800">{item.query}</span>
                    <span className="text-xs text-gray-500 ml-2">({item.mode === 'pnr' ? 'PNR' : 'Phone'})</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{item.timestamp.toLocaleTimeString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!searching && !result && !error && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Enter a PNR or phone number to search for a booking.</p>
        </div>
      )}
    </div>
  );
}
