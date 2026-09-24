import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ArrowLeftRight, ChevronRight, ChevronDown, Bus, Shield, CreditCard, Headphones, Star, Clock } from 'lucide-react';
import { tripAPI, cityAPI } from '../../api';
import type { City, Trip } from '../../types';
import DatePicker from '../../components/DatePicker';
import AmenityBadge from '../../components/AmenityBadge';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

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
  const [cities, setCities] = useState<City[]>([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [results, setResults] = useState<Trip[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches());
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const [originOpen, setOriginOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTripDate(today);
    cityAPI
      .getAll()
      .then((res) => setCities(res.data.data.cities || res.data.data))
      .catch(() => toast.error('Failed to load cities'));
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (origin === destination) {
      toast.error('Origin and destination must be different');
      return;
    }
    if (!origin || !destination) {
      toast.error('Please select both cities');
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    saveRecentSearch(origin, destination, tripDate);
    setRecentSearches(getRecentSearches());
    try {
      const res = await tripAPI.search({
        origin_city: origin,
        destination_city: destination,
        trip_date: tripDate,
      });
      setResults(res.data.data.trips || res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
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

  const offers = [
    {
      title: 'Flat 15% OFF',
      desc: 'On all AC bus bookings',
      code: 'AC15',
      bg: 'from-red-500 to-red-600',
    },
    {
      title: 'First Ride Free',
      desc: 'New users get NPR 200 off',
      code: 'NEW200',
      bg: 'from-rose-400 to-rose-500',
    },
    {
      title: 'Weekend Deal',
      desc: 'Save up to NPR 300 on Fri-Sun',
      code: 'WEEKEND',
      bg: 'from-red-600 to-red-700',
    },
    {
      title: 'Group Booking',
      desc: '10% off for 4+ passengers',
      code: 'GROUP10',
      bg: 'from-red-500 to-rose-500',
    },
  ];

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
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Search Widget */}
      <div className="max-w-5xl mx-auto px-4 -mt-4 relative z-20">
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)', borderRadius: '16px' }}
        >
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
                  <MapPin className="h-4 w-4 text-red-500 shrink-0" />
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
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
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
                  <MapPin className="h-4 w-4 text-green-500 shrink-0" />
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
                          ? 'bg-red-100 text-red-600 border border-red-200'
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
                  className="w-full lg:w-auto text-white px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  style={{ backgroundColor: '#d84e55', minWidth: '160px' }}
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-200 rounded-full text-xs text-gray-600 hover:text-red-600 transition-all"
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
                  className="w-14 h-14 border-4 border-red-100 border-t-red-500 rounded-full animate-spin mb-4"
                />
                <p className="text-gray-500 font-medium text-sm">
                  Searching for available buses...
                </p>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">
                      {origin} → {destination}
                    </h2>
                    <p className="text-sm text-gray-500">
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
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    Clear search
                  </button>
                </div>

                {/* Amenities Filter */}
                {allAmenities.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
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
                        className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all overflow-hidden group"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                      >
                        <div className="p-5">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {/* Left: Bus Info */}
                            <div className="flex items-center gap-3 lg:w-[200px]">
                              <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                                <Bus
                                  className="h-5 w-5"
                                  style={{ color: '#d84e55' }}
                                />
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
                                <div className="w-full h-[1.5px] bg-gray-200 relative rounded-full">
                                  <div
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: '#d84e55' }}
                                  />
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-green-500 rounded-full" />
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
                                <p className="text-2xl font-extrabold text-gray-900">
                                  NPR {trip.current_fare}
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
                                className="text-white px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-1 whitespace-nowrap shadow-md"
                                style={{ backgroundColor: '#d84e55' }}
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
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Bus className="h-10 w-10 text-gray-300" />
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
            {/* Offers Section */}
            <div className="mb-10">
              <h2
                className="text-xl font-bold text-gray-800 mb-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Exclusive Offers
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {offers.map((offer, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 w-[260px] bg-gradient-to-r ${offer.bg} rounded-xl p-5 text-white relative overflow-hidden cursor-pointer hover:shadow-lg transition-all`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-6 -mt-6" />
                    <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/10 rounded-full -ml-4 -mb-4" />
                    <p className="text-lg font-bold relative z-10">
                      {offer.title}
                    </p>
                    <p className="text-sm text-white/80 mt-1 relative z-10">
                      {offer.desc}
                    </p>
                    <div className="mt-3 flex items-center gap-2 relative z-10">
                      <span className="bg-white/20 px-2.5 py-1 rounded text-xs font-bold tracking-wide">
                        {offer.code}
                      </span>
                      <Star className="h-3 w-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Routes Section */}
            <div className="mb-10">
              <h2
                className="text-xl font-bold text-gray-800 mb-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Top Bus Routes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                    className="bg-white rounded-xl border border-gray-100 p-4 hover:border-red-200 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-gray-800 group-hover:text-red-600 transition-colors">
                          <span className="font-semibold text-sm">
                            {route.from}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                          <span className="font-semibold text-sm">
                            {route.to}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <p
                            className="text-sm font-bold"
                            style={{ color: '#d84e55' }}
                          >
                            From NPR {route.price.toLocaleString()}
                          </p>
                          <span className="text-xs text-gray-400">
                            · {route.duration}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-red-500 transition-colors shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Why Book With Us */}
            <div className="mb-10">
              <h2
                className="text-xl font-bold text-gray-800 mb-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Why Book With Us
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {whyBookWithUs.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-100 p-6 text-center hover:shadow-md transition-all"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: '#fef2f2' }}
                    >
                      <item.icon
                        className="h-7 w-7"
                        style={{ color: '#d84e55' }}
                      />
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
            <div className="mb-10">
              <h2
                className="text-xl font-bold text-gray-800 mb-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Our Travel Partners
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {travelPartners.map((partner, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-5 py-3 bg-gray-50 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Bus
                        className="h-5 w-5"
                        style={{ color: '#d84e55' }}
                      />
                      <span className="text-sm font-semibold text-gray-700">
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

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
