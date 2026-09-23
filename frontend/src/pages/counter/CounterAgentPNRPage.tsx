import { useState, useCallback } from 'react';
import { Search, Phone, Ticket, MapPin, Calendar, Clock, Users, Printer, X, Loader2, Download } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

interface BookingDetail {
  id: number;
  pnr: string;
  total_passengers: number;
  base_amount: string | number;
  tax_amount: string | number;
  service_fee: string | number;
  total_amount: string | number;
  payment_status: string;
  booking_status: string;
  booking_date: string;
  user?: { id?: number; full_name: string; phone_number: string };
  trip?: {
    trip_date: string;
    departure_time: string;
    arrival_time?: string;
    current_fare?: string;
    route?: { route_name?: string; origin_city: string; destination_city: string; distance_km?: number };
    bus?: { bus_number: string; bus_type: string; total_seats?: number };
  };
  passengers?: { passenger_name: string; seat_number: string; phone_number?: string; age?: number; gender?: string }[];
}

interface LookupHistoryItem {
  query: string;
  mode: 'pnr' | 'phone';
  timestamp: Date;
}

const sanitize = (str: string) => String(str || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export default function CounterAgentPNRPage() {
  const [searchMode, setSearchMode] = useState<'pnr' | 'phone'>('pnr');
  const [pnrInput, setPnrInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<BookingDetail | null>(null);
  const [results, setResults] = useState<BookingDetail[]>([]);
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
    setResults([]);
    try {
      const res = await api.get(`/bookings/verify-pnr/${query}`);
      const booking = res.data.data.booking || res.data.data;
      setResult(booking);
      setResults([booking]);
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
    setResults([]);
    try {
      const res = await api.get('/bookings/counter/search-by-phone', { params: { phone: query } });
      const bookings = res.data.data.bookings || [];
      if (Array.isArray(bookings) && bookings.length > 0) {
        setResults(bookings);
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

  const handleCancel = async (booking?: BookingDetail) => {
    const target = booking || result;
    if (!target) return;
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      await api.post(`/bookings/${target.id}/cancel`, { cancellation_reason: 'Counter agent cancellation' });
      const updated = { ...target, booking_status: 'CANCELLED' };
      setResult((prev) => prev?.id === target.id ? updated : prev);
      setResults((prev) => prev.map((b) => b.id === target.id ? updated : b));
      toast.success('Booking cancelled successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = (booking?: BookingDetail) => {
    const target = booking || result;
    if (!target) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const pnr = target.pnr;
    const route = `${target.trip?.route?.origin_city} → ${target.trip?.route?.destination_city}`;
    const passengerRows = target.passengers
      ?.map(
        (p, i) =>
          `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${i + 1}</td><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(p.passenger_name)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(p.seat_number)}</td><td style="padding:4px 8px;border:1px solid #ddd;">${sanitize(p.phone_number || '-')}</td></tr>`
      )
      .join('') || '';
    printWindow.document.write(`
      <html><head><title>Ticket - ${sanitize(pnr)}</title>
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
        .stamp span { display: inline-block; border: 3px solid ${target.payment_status === 'COMPLETED' ? '#16a34a' : '#f59e0b'}; color: ${target.payment_status === 'COMPLETED' ? '#16a34a' : '#f59e0b'}; font-size: 16px; font-weight: bold; padding: 4px 16px; border-radius: 4px; transform: rotate(-5deg); }
      </style></head><body>
      <div class="ticket">
        <div class="header"><h1>Gadi Yatra</h1></div>
        <div class="info-row"><span>PNR</span><strong>${sanitize(pnr)}</strong></div>
        <div class="info-row"><span>Route</span><strong>${sanitize(route)}</strong></div>
        <div class="info-row"><span>Date</span><strong>${sanitize(target.trip?.trip_date || '')}</strong></div>
        <div class="info-row"><span>Time</span><strong>${sanitize(target.trip?.departure_time || '')}</strong></div>
        <div class="info-row"><span>Bus</span><strong>${sanitize(target.trip?.bus?.bus_type || '')} (${sanitize(target.trip?.bus?.bus_number || '')})</strong></div>
        <table><thead><tr><th>#</th><th>Passenger</th><th>Seat</th><th>Phone</th></tr></thead><tbody>${passengerRows}</tbody></table>
        <div class="total">Total: NPR ${target.total_amount?.toLocaleString()}</div>
        <div class="stamp"><span>${target.payment_status === 'COMPLETED' ? 'PAID - CASH' : sanitize(target.booking_status)}</span></div>
      </div>
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const exportCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportSearchResult = () => {
    const dataToExport = results.length > 0 ? results : result ? [result] : [];
    if (dataToExport.length === 0) {
      toast.error('No search result to export');
      return;
    }
    const rows = dataToExport.map((r) => ({
      PNR: r.pnr,
      Passenger: r.user?.full_name || '',
      Phone: r.user?.phone_number || '',
      Route: `${r.trip?.route?.origin_city || ''} → ${r.trip?.route?.destination_city || ''}`,
      Date: r.trip?.trip_date || '',
      Time: r.trip?.departure_time || '',
      Bus: r.trip?.bus?.bus_number || '',
      'Bus Type': r.trip?.bus?.bus_type || '',
      Passengers: r.passengers?.length || 0,
      'Base Amount': r.base_amount || 0,
      Tax: r.tax_amount || 0,
      'Service Fee': r.service_fee || 0,
      Total: r.total_amount || 0,
      Status: r.booking_status,
      Payment: r.payment_status,
    }));
    exportCSV(rows, `bookings-${rows[0]?.PNR || 'search'}.csv`, Object.keys(rows[0]));
    toast.success('CSV exported successfully');
  };

  const statusColors: Record<string, string> = {
    CONFIRMED: 'bg-green-100 text-green-700',
    PENDING: 'bg-red-50 text-[#d84e55]',
    CANCELLED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
  };

  const renderBookingCard = (booking: BookingDetail, index?: number) => (
    <div key={booking.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${index !== undefined ? `animate-stagger-in stagger-${Math.min(index + 1, 4)}` : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500">PNR Number</p>
          <p className="text-2xl font-mono font-bold text-[#d84e55]">{booking.pnr}</p>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[booking.booking_status] || 'bg-gray-100 text-gray-600'}`}>
            {booking.booking_status}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${booking.payment_status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-[#d84e55]'}`}>
            {booking.payment_status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">PASSENGER INFO</p>
          <p className="font-medium text-gray-800">{booking.user?.full_name || 'Customer'}</p>
          <p className="text-sm text-gray-600">{booking.user?.phone_number}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">TRIP INFO</p>
          <div className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-3.5 w-3.5 text-green-600" />
            <span className="font-medium">{booking.trip?.route?.origin_city}</span>
            <span className="text-gray-400">→</span>
            <span className="font-medium">{booking.trip?.route?.destination_city}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {booking.trip?.trip_date}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {booking.trip?.departure_time}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{booking.trip?.bus?.bus_type} ({booking.trip?.bus?.bus_number})</p>
        </div>
      </div>

      {booking.passengers && booking.passengers.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-2 font-medium">PASSENGERS ({booking.passengers.length})</p>
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
              {booking.passengers.map((p, i) => (
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

      <div className="bg-red-50 rounded-lg p-4 mb-6">
        <p className="text-xs text-gray-500 mb-2 font-medium">FARE BREAKDOWN</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Base Amount</span><span className="font-medium">NPR {booking.base_amount?.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Tax (13%)</span><span className="font-medium">NPR {booking.tax_amount?.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Service Fee</span><span className="font-medium">NPR {booking.service_fee?.toLocaleString()}</span></div>
          <div className="flex justify-between font-bold text-[#d84e55] pt-1 border-t border-red-200">
            <span>Total</span><span>NPR {booking.total_amount?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handlePrint(booking)}
          className="flex-1 py-2.5 bg-[#d84e55] text-white font-bold text-sm rounded-lg hover:bg-[#c4424a] transition-colors flex items-center justify-center gap-2 btn-press"
        >
          <Printer className="h-4 w-4" /> Print Ticket
        </button>
        <button
          onClick={handleExportSearchResult}
          className="py-2.5 border border-gray-200 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 px-4 btn-press"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
        {booking.booking_status === 'CONFIRMED' && (
          <button
            onClick={() => handleCancel(booking)}
            disabled={cancelling}
            className="flex-1 py-2.5 border border-red-200 text-red-600 font-bold text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors btn-press"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        )}
      </div>
    </div>
  );

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
            onClick={() => { setSearchMode('pnr'); setResult(null); setResults([]); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors btn-press ${
              searchMode === 'pnr' ? 'bg-[#d84e55] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Ticket className="h-4 w-4" /> PNR Lookup
          </button>
          <button
            onClick={() => { setSearchMode('phone'); setResult(null); setResults([]); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors btn-press ${
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
            className="px-6 py-2.5 bg-[#d84e55] text-white text-sm font-bold rounded-lg hover:bg-[#c4424a] disabled:opacity-50 transition-colors flex items-center gap-2 btn-press"
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

      {/* Results */}
      {results.length > 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{results.length} bookings found</p>
          {results.map((booking, index) => renderBookingCard(booking, index))}
        </div>
      ) : result ? (
        renderBookingCard(result)
      ) : null}

      {/* Recent Lookups */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Recent Lookups</h3>
          </div>
          <div className="space-y-2">
            {history.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  if (item.mode === 'pnr') { setPnrInput(item.query); setSearchMode('pnr'); }
                  else { setPhoneInput(item.query); setSearchMode('phone'); }
                }}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left btn-press"
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
      {!searching && !result && results.length === 0 && !error && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Enter a PNR or phone number to search for a booking.</p>
        </div>
      )}
    </div>
  );
}
