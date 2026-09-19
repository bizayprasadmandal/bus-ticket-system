import { useState, useEffect } from 'react';
import { Search, Calendar, Users, ArrowLeftRight, ChevronRight, Bus, Shield, CreditCard, Headphones } from 'lucide-react';
import { tripAPI, cityAPI } from '../../api';
import type { City, Trip } from '../../types';
import toast from 'react-hot-toast';

export default function SearchPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [results, setResults] = useState<Trip[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTripDate(today);
    cityAPI.getAll()
      .then((res) => setCities(res.data.data.cities || res.data.data))
      .catch(() => toast.error('Failed to load cities'));
  }, []);

  const swapCities = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (origin === destination) {
      toast.error('Origin and destination must be different');
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await tripAPI.search({
        origin_city: origin,
        destination_city: destination,
        trip_date: tripDate,
        passengers,
      });
      setResults(res.data.data.trips || res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const popularRoutes = [
    { from: 'Kathmandu', to: 'Pokhara', price: 'NPR 1,200' },
    { from: 'Kathmandu', to: 'Chitwan', price: 'NPR 800' },
    { from: 'Kathmandu', to: 'Biratnagar', price: 'NPR 1,700' },
    { from: 'Pokhara', to: 'Kathmandu', price: 'NPR 1,200' },
    { from: 'Kathmandu', to: 'Nepalgunj', price: 'NPR 2,100' },
  ];

  const setQuickDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setTripDate(d.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 px-4 sm:px-6 lg:px-8 py-10 mb-8 rounded-b-3xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-40 h-40 bg-white rounded-full" />
          <div className="absolute bottom-5 left-10 w-24 h-24 bg-white rounded-full" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Book Bus Tickets Online
          </h1>
          <p className="text-primary-100 text-base md:text-lg">
            Safe, comfortable & affordable bus travel across Nepal
          </p>
        </div>
      </div>

      {/* Search Widget */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 -mt-16 relative z-20 mb-8">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* From */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary-500 rounded-full" />
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm bg-gray-50 focus:bg-white font-medium text-gray-800 appearance-none"
                  required
                >
                  <option value="">Select city</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <div className="hidden md:flex md:col-span-1 justify-center pb-1">
              <button
                type="button"
                onClick={swapCities}
                className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-200 text-gray-400 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-all"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>

            {/* To */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-green-500 rounded-full" />
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm bg-gray-50 focus:bg-white font-medium text-gray-800 appearance-none"
                  required
                >
                  <option value="">Select city</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Journey Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm bg-gray-50 focus:bg-white font-medium text-gray-800"
                  required
                />
              </div>
            </div>

            {/* Passengers */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Passengers</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm bg-gray-50 focus:bg-white font-medium text-gray-800 appearance-none"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSearching}
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/25 hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Search className="h-4 w-4" />
                {isSearching ? 'Searching...' : 'Search Buses'}
              </button>
            </div>
          </div>

          {/* Date Quick Picks */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-400 font-medium py-1">Quick select:</span>
            {[
              { label: 'Today', days: 0 },
              { label: 'Tomorrow', days: 1 },
              { label: formatDate(new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]), days: 2 },
              { label: formatDate(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]), days: 3 },
            ].map((item) => (
              <button
                key={item.days}
                type="button"
                onClick={() => setQuickDate(item.days)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  tripDate === new Date(Date.now() + item.days * 86400000).toISOString().split('T')[0]
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="mb-8">
          {isSearching ? (
            <div className="flex flex-col items-center py-16">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Searching for available buses...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">{results.length} buses found</h2>
              </div>
              <div className="space-y-4">
                {results.map((trip: any) => (
                  <div key={trip.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left - Bus Info */}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                            <Bus className="h-6 w-6 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{trip.bus?.bus_number || 'Bus'}</p>
                            <p className="text-xs text-gray-500">{trip.bus?.bus_type || 'Deluxe'}</p>
                          </div>
                        </div>

                        {/* Center - Route & Time */}
                        <div className="flex items-center gap-6 flex-1 justify-center">
                          <div className="text-center">
                            <p className="text-xl font-bold text-gray-800">{trip.departure_time?.substring(0, 5)}</p>
                            <p className="text-xs text-gray-500">{trip.route?.origin_city}</p>
                          </div>
                          <div className="flex flex-col items-center gap-1 min-w-[120px]">
                            <p className="text-[10px] text-gray-400 font-medium">{trip.route?.estimated_duration_minutes || '—'} min</p>
                            <div className="w-full h-[2px] bg-gray-200 relative">
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary-500 rounded-full" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">{trip.route?.distance_km || '—'} km</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-gray-800">{trip.arrival_time?.substring(0, 5)}</p>
                            <p className="text-xs text-gray-500">{trip.route?.destination_city}</p>
                          </div>
                        </div>

                        {/* Right - Price & Book */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Starting from</p>
                            <p className="text-2xl font-bold text-primary-600">NPR {trip.current_fare}</p>
                            <p className="text-xs text-green-600 font-medium">{trip.available_seats} seats left</p>
                          </div>
                          <a
                            href={`/book/${trip.id}`}
                            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20 hover:shadow-lg active:scale-[0.98] flex items-center gap-1 whitespace-nowrap"
                          >
                            Book Now
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bus className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No buses found</h3>
              <p className="text-gray-500 text-sm">Try a different date or route</p>
            </div>
          )}
        </div>
      )}

      {/* Popular Routes (shown when no search) */}
      {!hasSearched && (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Popular Routes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {popularRoutes.map((route, i) => (
                <button
                  key={i}
                  onClick={() => { setOrigin(route.from); setDestination(route.to); }}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:border-primary-200 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">{route.from} → {route.to}</p>
                      <p className="text-sm text-primary-600 font-bold mt-1">From {route.price}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'Safe & Secure', desc: 'Verified operators and secure payments' },
              { icon: CreditCard, title: 'Easy Payment', desc: 'Pay with eSewa, Khalti, or wallet' },
              { icon: Headphones, title: '24/7 Support', desc: 'Call us anytime for help' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 text-center">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <item.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
