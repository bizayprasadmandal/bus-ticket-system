import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, Users, MapPin, Phone, Clock, ArrowRight, Bus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

interface PassengerDetail {
  name: string;
  seat_number: string;
  phone?: string;
}

interface BookingDetail {
  id: number;
  pnr: string;
  total_passengers: number;
  total_amount: number;
  booking_status: string;
  payment_status?: string;
  boarded?: boolean;
  trip?: {
    trip_date: string;
    departure_time: string;
    route?: { origin_city: string; destination_city: string };
    bus?: { bus_number: string; bus_type: string };
  };
  user?: { full_name: string; phone_number: string };
  passengers?: PassengerDetail[];
}

interface VerificationHistory {
  pnr: string;
  status: 'success' | 'error';
  timestamp: Date;
  booking?: BookingDetail;
}

export default function ConductorVerifyPage() {
  const [pnr, setPnr] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingDetail | null>(null);
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyPageSize = 10;

  const loadHistory = useCallback(async () => {
    // Verification history is maintained client-side;
    // this refresh keeps the hook's timer active for consistency.
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadHistory, 30000);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = useCallback(async () => {
    if (!pnr.trim()) {
      toast.error('Please enter a PNR code');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.get(`/bookings/verify-pnr/${pnr.trim()}`);
      const booking = res.data.data;
      setResult(booking);
      setHistory(prev => {
        const newHistory = [{ pnr: pnr.trim(), status: 'success' as const, timestamp: new Date(), booking }, ...prev];
        return newHistory.slice(0, 10);
      });
      toast.success('Booking found');
    } catch {
      setHistory(prev => {
        const newHistory = [{ pnr: pnr.trim(), status: 'error' as const, timestamp: new Date() }, ...prev];
        return newHistory.slice(0, 10);
      });
      toast.error('Booking not found');
    } finally {
      setLoading(false);
    }
  }, [pnr]);

  const handleMarkBoarded = async (bookingId: number) => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/board`);
      setResult(prev => prev ? { ...prev, boarded: true } : prev);
      setHistory(prev =>
        prev.map(h => h.booking?.id === bookingId ? { ...h, booking: { ...h.booking!, boarded: true } } : h)
      );
      toast.success('Passenger boarded successfully');
    } catch {
      toast.error('Failed to mark as boarded');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async (bookingId: number) => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/no-show`);
      toast.success('Passenger marked as no-show');
      setResult(null);
      setPnr('');
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to mark as no-show');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPnr('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const getVerificationStatus = (booking: BookingDetail) => {
    if (booking.booking_status === 'CANCELLED') return 'cancelled';
    if (booking.payment_status === 'COMPLETED' && booking.booking_status === 'CONFIRMED') return 'confirmed';
    if (booking.booking_status === 'CONFIRMED' && booking.payment_status === 'PENDING') return 'pending';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Verify Ticket</h1>
        <p className="text-sm text-gray-500 mt-1">Scan or enter PNR code to verify passenger tickets</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter or scan PNR code"
              value={pnr}
              onChange={(e) => setPnr(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-lg text-lg font-mono focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={loading || !pnr.trim()}
            className="px-6 py-3.5 bg-[#d84e55] text-white rounded-lg font-medium hover:bg-[#c23e44] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            Verify
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {(() => {
            const verificationStatus = getVerificationStatus(result);
            return (
              <>
                <div className={`p-6 ${
                  verificationStatus === 'confirmed' ? 'bg-green-50 border-b border-green-100' :
                  verificationStatus === 'cancelled' ? 'bg-red-50 border-b border-red-100' :
                  'bg-yellow-50 border-b border-yellow-100'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      verificationStatus === 'confirmed' ? 'bg-green-100' :
                      verificationStatus === 'cancelled' ? 'bg-red-100' :
                      'bg-yellow-100'
                    }`}>
                      {verificationStatus === 'confirmed' ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      ) : verificationStatus === 'cancelled' ? (
                        <XCircle className="h-8 w-8 text-red-600" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-mono font-bold text-gray-800">{result.pnr}</p>
                      <p className={`text-sm font-medium ${
                        verificationStatus === 'confirmed' ? 'text-green-700' :
                        verificationStatus === 'cancelled' ? 'text-red-700' :
                        'text-yellow-700'
                      }`}>
                        {verificationStatus === 'confirmed' ? 'VERIFIED - CONFIRMED' :
                         verificationStatus === 'cancelled' ? 'CANCELLED' :
                         'PENDING VERIFICATION'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Passenger Details</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="font-medium text-gray-800">{result.user?.full_name || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium text-gray-800">{result.user?.phone_number || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Trip Details</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm text-gray-500">Route</p>
                            <p className="font-medium text-gray-800">
                              {result.trip?.route?.origin_city}
                              <ArrowRight className="inline h-3 w-3 mx-1 text-gray-400" />
                              {result.trip?.route?.destination_city}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Date & Time</p>
                            <p className="font-medium text-gray-800">
                              {result.trip?.trip_date} at {result.trip?.departure_time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Bus className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Bus Number</p>
                            <p className="font-medium text-gray-800">{result.trip?.bus?.bus_number || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {result.passengers && result.passengers.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Passengers ({result.passengers.length})</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex flex-wrap gap-2">
                          {result.passengers.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <span className="font-medium text-gray-800">{p.name}</span>
                              <span className="px-2 py-0.5 bg-[#d84e55]/10 text-[#d84e55] rounded text-xs font-bold">
                                Seat {p.seat_number}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Total Fare</p>
                      <p className="text-2xl font-bold text-gray-800">NPR {result.total_amount.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!result.boarded && (
                        <>
                          <button
                            onClick={() => handleMarkBoarded(result.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#d84e55] text-white rounded-lg font-medium hover:bg-[#c23e44] disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Mark Boarded
                          </button>
                          <button
                            onClick={() => handleNoShow(result.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            No-Show
                          </button>
                        </>
                      )}
                      {result.boarded && (
                        <span className="flex items-center gap-2 px-5 py-2.5 bg-green-100 text-green-700 rounded-lg font-medium">
                          <CheckCircle className="h-4 w-4" />
                          Boarded
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
          <div className="px-6 pb-6">
            <button
              onClick={handleReset}
              className="w-full py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Verify Another
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Recent Verifications</h3>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {history
              .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
              .map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {item.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-mono text-sm font-medium text-gray-800">{item.pnr}</span>
                <span className={`text-xs font-medium ${item.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.status === 'success' ? 'Found' : 'Not Found'}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {item.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
          {Math.ceil(history.length / historyPageSize) > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {((historyPage - 1) * historyPageSize) + 1} to {Math.min(historyPage * historyPageSize, history.length)} of {history.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, Math.ceil(history.length / historyPageSize)) }, (_, i) => {
                  const totalPages = Math.ceil(history.length / historyPageSize);
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (historyPage <= 3) {
                    page = i + 1;
                  } else if (historyPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = historyPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setHistoryPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        historyPage === page ? 'bg-[#d84e55] text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setHistoryPage((p) => Math.min(Math.ceil(history.length / historyPageSize), p + 1))}
                  disabled={historyPage === Math.ceil(history.length / historyPageSize)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
