import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Calendar,
  Clock,
  Bus,
  Users,
  Search,
  Armchair,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { bookingAPI } from '../../api';
import type { Booking } from '../../types';
import toast from 'react-hot-toast';
import CancelBookingModal from '../../components/CancelBookingModal';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

const STRIP_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-emerald-500',
  PENDING: 'bg-amber-500',
  CANCELLED: 'bg-red-500',
  COMPLETED: 'bg-gray-400',
};

const FILTER_TABS = ['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'] as const;

function mapStatus(filter: string, booking: Booking): boolean {
  if (filter === 'ALL') return true;
  const s = booking.booking_status;
  if (filter === 'UPCOMING') return s === 'CONFIRMED' || s === 'PENDING';
  return s === filter;
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchBookings = useCallback(async () => {
    try {
      const res = await bookingAPI.getAll();
      setBookings(res.data.data.bookings || res.data.data);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated } = useAutoRefresh(fetchBookings, 30000);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const toggleExpand = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

  const handleCancelled = () => {
    fetchBookings();
  };

  const filtered = useMemo(() => bookings.filter((b) => mapStatus(filter, b)), [bookings, filter]);

  const counts: Record<string, number> = {
    ALL: bookings.length,
    UPCOMING: bookings.filter(
      (b) => b.booking_status === 'CONFIRMED' || b.booking_status === 'PENDING'
    ).length,
    COMPLETED: bookings.filter((b) => b.booking_status === 'COMPLETED').length,
    CANCELLED: bookings.filter((b) => b.booking_status === 'CANCELLED').length,
  };

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedBookings = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-14 h-14 border-4 border-[#d84e55]/20 border-t-[#d84e55] rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium text-sm">Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            My Bookings
          </h1>
          <p className="text-sm text-gray-400 mt-1">View and manage your trips</p>
        </div>

        {/* Filter Tabs - redBus pill style */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                filter === tab
                  ? 'text-white shadow-md'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
              style={
                filter === tab
                  ? { backgroundColor: '#d84e55', boxShadow: '0 4px 12px rgba(216,78,85,0.3)' }
                  : {}
              }
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
              <span className="ml-1.5 text-[10px] opacity-80">({counts[tab]})</span>
            </button>
          ))}
        </div>

        {/* Auto-refresh indicator */}
        {lastUpdated && (
          <div className="flex items-center justify-end gap-1.5 mb-3">
            <RefreshCw className={`h-3 w-3 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-[10px] text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Empty State */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-5 border border-gray-100 shadow-sm">
              <div className="w-20 h-20 bg-[#d84e55]/5 rounded-full flex items-center justify-center">
                <Ticket className="h-10 w-10 text-[#d84e55]/40" />
              </div>
            </div>
            <h3
              className="text-lg font-bold text-gray-700 mb-1"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              No bookings found
            </h3>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              You haven't made any bookings yet. Search for a route to get started!
            </p>
            <button
              className="mt-5 px-6 py-2.5 text-white text-sm font-bold rounded-full transition-all"
              style={{ backgroundColor: '#d84e55' }}
              onClick={() => navigate('/search')}
            >
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Buses
              </span>
            </button>
          </div>
        ) : (
          <>
          <div className="space-y-3">
            {paginatedBookings.map((booking) => {
              const status = booking.booking_status || 'CONFIRMED';
              const colors = STATUS_COLORS[status] || STATUS_COLORS.CONFIRMED;
              const stripColor = STRIP_COLORS[status] || STRIP_COLORS.CONFIRMED;
              const isExpanded = expandedId === booking.id;

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden transition-shadow duration-200 hover:shadow-md"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex">
                    {/* Left colored strip */}
                    <div className={`w-1.5 flex-shrink-0 ${stripColor}`} />

                    {/* Content */}
                    <div className="flex-1 p-4 cursor-pointer" onClick={() => toggleExpand(booking.id)}>
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: Route & Info */}
                        <div className="flex-1 min-w-0">
                          {/* Route */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-gray-900 truncate">
                              {booking.trip?.route?.origin_city}
                            </span>
                            <span className="text-[#d84e55]">
                              <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                                <path
                                  d="M1 4h12M11 1l3 3-3 3"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            <span className="text-sm font-bold text-gray-900 truncate">
                              {booking.trip?.route?.destination_city}
                            </span>
                          </div>

                          {/* Date, Time, Bus */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {booking.trip?.trip_date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booking.trip?.departure_time || '--:--'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bus className="h-3 w-3" />
                              {booking.trip?.bus?.bus_type || 'Standard'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {booking.total_passengers} {booking.total_passengers === 1 ? 'Passenger' : 'Passengers'}
                            </span>
                          </div>

                          {/* PNR + Status */}
                          <div className="flex items-center gap-2 mt-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100">
                              <Armchair className="h-3 w-3 text-gray-400" />
                              <span className="text-xs font-bold text-gray-600 font-mono">
                                PNR: {booking.pnr}
                              </span>
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                              <span className="text-xs font-bold">{status}</span>
                            </span>
                          </div>
                        </div>

                        {/* Right: Amount & Expand */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <p className="text-lg font-extrabold text-gray-900">
                            NPR {booking.total_amount?.toLocaleString()}
                          </p>
                          <div className="w-7 h-7 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Passengers */}
                  {isExpanded && booking.passengers && booking.passengers.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50/60">
                      <div className="px-5 py-3.5">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Passenger Details
                        </h4>
                        <div className="space-y-2">
                          {booking.passengers.map((p) => (
                            <div
                              key={p.id}
                              className="bg-white rounded-lg p-3 border border-gray-100 flex items-center gap-3"
                            >
                              <span className="w-8 h-8 bg-[#d84e55]/10 text-[#d84e55] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {p.seat_number}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {p.passenger_name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {p.age} yrs &middot; {p.gender} &middot; {p.id_type}: {p.id_number}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {status === 'CONFIRMED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setCancelBookingId(booking.id); }}
                            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#d84e55] bg-[#d84e55]/5 hover:bg-[#d84e55]/10 rounded-full transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {filtered.length > pageSize && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-xs text-gray-400">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filtered.length)}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} bookings
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                        currentPage === pageNum
                          ? 'text-white shadow-md'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                      }`}
                      style={
                        currentPage === pageNum
                          ? { backgroundColor: '#d84e55', boxShadow: '0 4px 12px rgba(216,78,85,0.3)' }
                          : {}
                      }
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
      {cancelBookingId && (
        <CancelBookingModal
          bookingId={cancelBookingId}
          isOpen={true}
          onClose={() => setCancelBookingId(null)}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
}
