import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ArrowLeftRight, ChevronRight, ChevronDown, Bus, Shield, CreditCard, Headphones, Clock, Copy, Check } from 'lucide-react';
import { tripAPI, cityAPI, promoAPI } from '../../api';
import type { City, Trip } from '../../types';
import DatePicker from '../../components/DatePicker';
import AmenityBadge from '../../components/AmenityBadge';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';

interface Promo {
  id: number;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: string | number;
  min_amount: string | number;
  valid_from: string;
  valid_until: string;
}

const RECENT_SEARCHES_KEY = 'recentSearches';

function getRecentSearches(): { from: string; to: string; date: string }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentSearch(from: string, to: string, date: string) {
  const searches = getRecentSearches().filter(
    (s) => !(s.from === from && s.to === to && s.date === date)
  );
  searches.unshift({ from, to, date });
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, 5)));
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialFrom = searchParams.get('from') || '';
  const initialTo = searchParams.get('to') || '';
  const [cities, setCities] = useState<City[]>([]);
  const [origin, setOrigin] = useState(initialFrom);
  const [destination, setDestination] = useState(initialTo);
  const [tripDate, setTripDate] = useState('');
  const [results, setResults] = useState<Trip[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches());
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [copiedCode, setCopiedCode] = useState('');

  const [originOpen, setOriginOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [originFilter, setOriginFilter] = useState(initialFrom);
  const [destFilter, setDestFilter] = useState(initialTo);

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTripDate(today);
    cityAPI
      .getAll()
      .then((res) => {
        setCities(res.data.data.cities || res.data.data);
        if (initialFrom && initialTo && initialFrom !== initialTo) {
          runSearch(initialFrom, initialTo, today);
        }
      })
      .catch(() => toast.error('Failed to load cities'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Offers are non-critical: fail silently, the rest of the page still works.
    promoAPI
      .getActive()
      .then((res) => setPromos(res.data.data.promos || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (originRef.current && !originRef.current.contains(e.target as Node))
        setOriginOpen(false);
      if (destRef.current && !destRef.current.contains(e.target as Node))
        setDestOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const swapCities = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginFilter(destination);
    setDestFilter(origin);
  };

  const runSearch = async (from = origin, to = destination, date = tripDate) => {
    if (!from || !to) {
      toast.error('Please select both cities');
      return;
    }
    if (from === to) {
      toast.error('Origin and destination must be different');
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    saveRecentSearch(from, to, date);
    setRecentSearches(getRecentSearches());
    try {
      const res = await tripAPI.search({
        origin_city: from,
        destination_city: to,
        trip_date: date,
      });
      setResults(res.data.data.trips || res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch();
  };

  const setQuickDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setTripDate(d.toISOString().split('T')[0]);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Code ${code} copied`);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch {
      toast.error('Could not copy code');
    }
  };

  // DATEONLY strings are 'YYYY-MM-DD'; build a local Date so the day doesn't
  // shift back one day in timezones west of UTC.
  const formatValidUntil = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const allAmenities = Array.from(
    new Set(
      results.flatMap((t: any) => {
        try {
          const amenities = typeof t.bus?.amenities === 'string' ? JSON.parse(t.bus.amenities) : (t.bus?.amenities || []);
          return Array.isArray(amenities) ? amenities : [];
        } catch { return []; }
      })
    )
  );

  const filteredResults = selectedAmenities.length === 0
    ? results
    : results.filter((t: any) => {
        try {
          const amenities = typeof t.bus?.amenities === 'string' ? JSON.parse(t.bus.amenities) : (t.bus?.amenities || []);
          return selectedAmenities.every((a) => amenities.includes(a));
        } catch { return false; }
      });

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const popularRoutes = [
    { from: 'Kathmandu', to: 'Pokhara', price: 1200, duration: '6h 30m' },
    { from: 'Kathmandu', to: 'Chitwan', price: 800, duration: '4h 00m' },
    { from: 'Kathmandu', to: 'Biratnagar', price: 1700, duration: '9h 00m' },
    { from: 'Pokhara', to: 'Kathmandu', price: 1200, duration: '6h 30m' },
    { from: 'Kathmandu', to: 'Nepalgunj', price: 2100, duration: '12h 00m' },
    { from: 'Chitwan', to: 'Kathmandu', price: 800, duration: '4h 00m' },
  ];

  const whyBookWithUs = [
    {
      icon: CreditCard,
      title: 'Best Prices',
      desc: 'Compare fares across operators and get the lowest prices guaranteed.',
    },
    {
      icon: Shield,
      title: 'Safe & Secure',
      desc: 'Verified operators, secure payments, and insured journeys.',
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      desc: 'Round-the-clock customer support for all your queries.',
    },
  ];

  const travelPartners = [
    'Gadi Ticket',
    'Nepal Bus Co.',
    'Himalayan Express',
    'Mountain Travels',
    'Green Line',
    'Safari Tours',
    'Valley Express',
    'Royal Coach',
  ];

  const getBusTypeBadge = (type: string) => {
    const t = type?.toUpperCase() || '';
    if (t.includes('DELUXE') && !t.includes('SUPER'))
      return { label: 'DELUXE', color: 'bg-blue-100 text-blue-700' };
    if (t.includes('SUPER_DELUXE') || t.includes('SUPER'))
      return { label: 'SUPER DELUXE', color: 'bg-purple-100 text-purple-700' };
    if (t.includes('AC') || t.includes('SEATER'))
      return { label: 'AC', color: 'bg-green-100 text-green-700' };
    if (t.includes('SLEEPER'))
      return { label: 'SLEEPER', color: 'bg-amber-100 text-amber-700' };
    return { label: type || 'STANDARD', color: 'bg-gray-100 text-gray-700' };
  };

  const renderCityDropdown = (
    isOpen: boolean,
    filter: string,
    setFilter: (v: string) => void,
    setCity: (v: string) => void,
    setOpen: (v: boolean) => void,
    placeholder: string
  ) => {
    const filtered = cities.filter((c) =>
      c.name.toLowerCase().includes(filter.toLowerCase())
    );
    return (
      <div className="relative w-full">
        <div className="relative">
          <input
            type="text"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              if (!isOpen) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 pr-8 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-[#d84e55] focus:ring-2 focus:ring-[#d84e55]/20"
          />
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
        {isOpen && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
            {filtered.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => {
                  setCity(city.name);
                  setFilter(city.name);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-[#d84e55]/10 hover:text-[#d84e55] transition-colors text-left"
              >
                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="flex-1">{city.name}</span>
                {city.province && (
                  <span className="text-xs text-gray-400">
                    {city.province}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#7f2a2f_0%,#d84e55_58%,#f27278_100%)] px-6 pt-10 pb-24 sm:px-10 sm:pt-12 sm:pb-28 text-white shadow-[0_28px_60px_-32px_rgba(216,78,85,0.75)]">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-52 w-52 rounded-full bg-white/5 blur-2xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="relative max-w-2xl">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/25 backdrop-blur-sm"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Shield className="h-3.5 w-3.5" />
            Nepal's trusted bus booking
          </span>
          <h1
            className="mt-4 text-3xl sm:text-4xl lg:text-[2.7rem] font-extrabold leading-[1.15] tracking-tight"
          >
            Find, book &amp; ride{' '}
            <span className="text-[#ffe1e3]">across Nepal</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm sm:text-base text-white/85 leading-relaxed">
            Compare seats, fares and operators in a single search — instant confirmation,
            secure payments and your e-ticket on the phone.
          </p>
          <div className="mt-7 flex flex-wrap gap-x-9 gap-y-4">
            {[
              { value: '150+', label: 'Buses' },
              { value: '40+', label: 'Cities' },
              { value: '50k+', label: 'Happy travellers' },
              { value: '4.8/5', label: 'Traveller rating' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xl sm:text-2xl font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>
                  {stat.value}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search Widget */}
      <div className="max-w-5xl mx-auto -mt-14 relative z-20">
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_28px_60px_-30px_rgba(16,24,40,0.45)] ring-1 ring-gray-100/80">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col lg:flex-row">
              {/* FROM */}
              <div
                ref={originRef}
                className="flex-1 relative border-b lg:border-b-0 lg:border-r border-gray-100 px-5 py-3"
              >
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                  From
                </label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#d84e55] shrink-0" />
                  {renderCityDropdown(
                    originOpen,
                    originFilter,
                    setOriginFilter,
                    (v) => {
                      setOrigin(v);
                      setOriginFilter(v);
                    },
                    setOriginOpen,
                    'Select departure city'
                  )}
                </div>
              </div>

              {/* Swap */}
              <div className="hidden lg:flex items-center justify-center relative z-10 -ml-4 -mr-4">
                <button
                  type="button"
                  onClick={swapCities}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-gray-200 text-gray-400 hover:border-[#d84e55] hover:text-[#d84e55] hover:bg-[#fef2f2] transition-all shadow-sm"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>

              {/* TO */}
              <div
                ref={destRef}
                className="flex-1 relative border-b lg:border-b-0 lg:border-r border-gray-100 px-5 py-3"
              >
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                  To
                </label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                  {renderCityDropdown(
                    destOpen,
                    destFilter,
                    setDestFilter,
                    (v) => {
                      setDestination(v);
                      setDestFilter(v);
                    },
                    setDestOpen,
                    'Select destination city'
                  )}
                </div>
              </div>

              {/* DATE */}
              <div className="flex-1 lg:flex-[0.7] px-5 py-3 border-b lg:border-b-0 lg:border-r border-gray-100">
                <DatePicker
                  label="Journey Date"
                  value={tripDate}
                  onChange={setTripDate}
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Select date"
                />
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                  ].map((item) => (
                    <button
                      key={item.days}
                      type="button"
                      onClick={() => setQuickDate(item.days)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                        tripDate ===
                        new Date(Date.now() + item.days * 86400000)
                          .toISOString()
                          .split('T')[0]
                          ? 'bg-[#fef2f2] text-[#b53d43] border border-[#f5c6c9]'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEARCH BUTTON */}
              <div className="px-5 py-3 flex items-stretch">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="btn-primary w-full lg:w-auto"
                  style={{ minWidth: 170 }}
                >
                  <Search className="h-4 w-4" />
                  {isSearching ? 'Searching...' : 'SEARCH BUSES'}
                </button>
              </div>
            </div>
          </form>

          {/* Recent Searches */}
          {recentSearches.length > 0 && !hasSearched && (
            <div className="px-5 pb-4 border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3 mb-2">
                Recent Searches
              </p>
              <div className="flex gap-2 flex-wrap">
                {recentSearches.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setOrigin(s.from);
                      setDestination(s.to);
                      setTripDate(s.date);
                      setOriginFilter(s.from);
                      setDestFilter(s.to);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-[#fef2f2] border border-gray-100 hover:border-[#f5c6c9] rounded-full text-xs text-gray-600 hover:text-[#b53d43] transition-all"
                  >
                    <Clock className="h-3 w-3" />
                    {s.from} → {s.to}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 mt-8 pb-16">
        {/* Search Results */}
        {hasSearched && (
          <div className="mb-10">
            {isSearching ? (
              <div className="flex flex-col items-center py-20">
                <div
                  className="w-14 h-14 border-4 border-[#fee2e2] border-t-[#d84e55] rounded-full animate-spin mb-4"
                />
                <p className="text-gray-500 font-medium text-sm">
                  Searching for available buses...
                </p>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-[#d84e55] to-[#f27278]" />
                      <h2 className="text-lg font-bold text-gray-800">
                        {origin} → {destination}
                      </h2>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {filteredResults.length} buses found ·{' '}
                      {formatDisplayDate(tripDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHasSearched(false);
                      setResults([]);
                      setSelectedAmenities([]);
                    }}
                    className="text-sm text-[#d84e55] hover:text-[#b53d43] font-semibold"
                  >
                    Clear search
                  </button>
                </div>

                {/* Amenities Filter */}
                {allAmenities.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Filter by Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {allAmenities.map((amenity) => (
                        <AmenityBadge
                          key={amenity}
                          amenity={amenity}
                          size="md"
                          selected={selectedAmenities.includes(amenity)}
                          onClick={() => toggleAmenity(amenity)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {filteredResults.map((trip: any) => {
                    const badge = getBusTypeBadge(trip.bus?.bus_type);
                    return (
                      <div
                        key={trip.id}
                        className="bg-white rounded-xl border border-gray-100 hover:border-[#f5c6c9] transition-all overflow-hidden group card-hover"
                      >
                        <div className="p-5">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {/* Left: Bus Info */}
                            <div className="flex items-center gap-3 lg:w-[200px]">
                              <div className="w-11 h-11 bg-[#fef2f2] rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Bus className="h-5 w-5 text-[#d84e55]" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-800 text-sm truncate">
                                  {trip.bus?.bus_number || 'Bus'}
                                </p>
                                <span
                                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${badge.color}`}
                                >
                                  {badge.label}
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(() => {
                                    try {
                                      const amenities = typeof trip.bus?.amenities === 'string' ? JSON.parse(trip.bus.amenities) : (trip.bus?.amenities || []);
                                      return Array.isArray(amenities) ? amenities.slice(0, 3).map((a: string) => (
                                        <AmenityBadge key={a} amenity={a} size="sm" />
                                      )) : null;
                                    } catch { return null; }
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Center: Route & Time */}
                            <div className="flex items-center gap-4 flex-1 justify-center">
                              <div className="text-center min-w-[70px]">
                                <p className="text-xl font-bold text-gray-800">
                                  {trip.departure_time?.substring(0, 5)}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {trip.route?.origin_city}
                                </p>
                              </div>
                              <div className="flex flex-col items-center gap-0.5 min-w-[100px]">
                                <p className="text-[10px] text-gray-400 font-medium">
                                  {trip.route?.estimated_duration_minutes
                                    ? `${Math.floor(trip.route.estimated_duration_minutes / 60)}h ${trip.route.estimated_duration_minutes % 60}m`
                                    : '—'}
                                </p>
                                <div className="w-full h-[2px] bg-gradient-to-r from-[#d84e55] to-emerald-400 relative rounded-full">
                                  <div
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#d84e55] ring-2 ring-white"
                                  />
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium">
                                  Non-Stop
                                </p>
                              </div>
                              <div className="text-center min-w-[70px]">
                                <p className="text-xl font-bold text-gray-800">
                                  {trip.arrival_time?.substring(0, 5)}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {trip.route?.destination_city}
                                </p>
                              </div>
                            </div>

                            {/* Right: Price & Book */}
                            <div className="flex items-center gap-4 lg:w-[220px] justify-end">
                              <div className="text-right">
                                <p className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                                  NPR {Number(trip.current_fare).toLocaleString()}
                                </p>
                                <p
                                  className="text-[11px] font-semibold mt-0.5"
                                  style={{
                                    color:
                                      trip.available_seats <= 5
                                        ? '#d84e55'
                                        : '#16a34a',
                                  }}
                                >
                                  {trip.available_seats} SEATS LEFT
                                </p>
                              </div>
                              <Link
                                to={`/book/${trip.id}`}
                                className={`${
                                  trip.status === 'SCHEDULED'
                                    ? 'btn-primary'
                                    : 'inline-flex items-center gap-1 rounded-[0.875rem] bg-gray-200 text-gray-500 font-semibold text-sm px-6 py-2.5 cursor-not-allowed pointer-events-none'
                                }`}
                              >
                                BOOK
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="w-20 h-20 bg-[#fef2f2] rounded-full flex items-center justify-center mb-4 ring-8 ring-[#fef2f2]/60">
                  <Bus className="h-10 w-10 text-[#f5a3a8]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">
                  No buses found
                </h3>
                <p className="text-gray-500 text-sm">
                  Try a different date or route
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sections below search (always visible when not showing results) */}
        {!hasSearched && (
          <>
            {/* Best Offers For You */}
            {promos.length > 0 && (
              <div className="mb-12">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Save more</span>
                    <h2>Best Offers For You</h2>
                    <p>Apply these codes at checkout for an instant discount.</p>
                  </div>
                  <span className="hidden sm:inline text-xs text-gray-400 pb-1">
                    {promos.length} live offers
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {promos.map((p) => (
                    <div
                      key={p.id}
                      className="relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-[#f5c6c9] transition-all flex flex-col card-hover overflow-hidden"
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#d84e55] via-[#f27278] to-[#ffb3b7]" />
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold text-white shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #d84e55, #f07b81)' }}
                        >
                          {p.discount_type === 'percentage'
                            ? `${Number(p.discount_value)}% OFF`
                            : `NPR ${Number(p.discount_value).toLocaleString()} OFF`}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          Till {formatValidUntil(p.valid_until)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-2.5 flex-1">
                        {p.description || 'Special offer'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Min. spend NPR {Number(p.min_amount).toLocaleString()}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-dashed border-gray-200">
                        <span className="font-mono font-bold text-sm tracking-wider text-[#d84e55]">
                          {p.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode(p.code)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            copiedCode === p.code
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : 'border-[#f2c4c6] bg-white text-[#d84e55] hover:bg-[#fef2f2]'
                          }`}
                        >
                          {copiedCode === p.code ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedCode === p.code ? 'COPIED' : 'COPY CODE'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Routes Section */}
            <div className="mb-12">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Popular right now</span>
                  <h2>Top Bus Routes</h2>
                  <p>Tap a route to see available buses instantly.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularRoutes.map((route, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setOrigin(route.from);
                      setDestination(route.to);
                      setOriginFilter(route.from);
                      setDestFilter(route.to);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#f5c6c9] transition-all text-left group card-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-gray-800 group-hover:text-[#b53d43] transition-colors">
                          <span className="font-semibold text-sm">
                            {route.from}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                          <span className="font-semibold text-sm">
                            {route.to}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-sm font-bold text-[#d84e55]">
                            From NPR {route.price.toLocaleString()}
                          </p>
                          <span className="text-xs text-gray-400">
                            · {route.duration}
                          </span>
                        </div>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-[#fef2f2] group-hover:text-[#d84e55] transition-colors shrink-0">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Why Book With Us */}
            <div className="mb-12">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Why Gadi Ticket</span>
                  <h2>Why Book With Us</h2>
                  <p>Everything you need for a stress-free journey.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {whyBookWithUs.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-md transition-all card-hover"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[#fef2f2] to-[#fde7e8] ring-1 ring-[#fde7e8]">
                      <item.icon className="h-7 w-7 text-[#d84e55]" />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Travel Partners */}
            <div className="mb-6">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Trusted network</span>
                  <h2>Our Travel Partners</h2>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {travelPartners.map((partner, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-5 py-3 bg-gray-50 rounded-xl hover:bg-[#fef2f2] transition-colors cursor-pointer group"
                    >
                      <Bus className="h-5 w-5 text-[#d84e55] group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-[#b53d43] transition-colors">
                        {partner}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
