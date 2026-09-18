import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Clock, Users, Bus } from 'lucide-react';
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

  useEffect(() => {
    cityAPI.getAll()
      .then((res) => setCities(res.data.data.cities || res.data.data))
      .catch(() => toast.error('Failed to load cities'));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (origin === destination) {
      toast.error('Origin and destination must be different');
      return;
    }
    setIsSearching(true);
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Find Your Bus</h1>
        <p className="text-gray-500 mt-1">Search available trips across Nepal</p>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passengers</label>
            <div className="relative">
              <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="number"
                min={1}
                max={10}
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {results.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {results.length} trip{results.length !== 1 ? 's' : ''} found
          </h2>
          <div className="space-y-4">
            {results.map((trip) => (
              <div key={trip.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Bus className="h-4 w-4" />
                      <span>{trip.bus?.bus_number} &middot; {trip.bus?.bus_type}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {trip.route?.origin_city} &rarr; {trip.route?.destination_city}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {trip.departure_time}
                      </span>
                      <span>{trip.route?.distance_km} km</span>
                      <span>{trip.route?.estimated_duration_minutes} min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 md:text-right">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">Rs. {trip.current_fare}</p>
                      <p className="text-sm text-gray-500">
                        {trip.available_seats} seat{trip.available_seats !== 1 ? 's' : ''} left
                      </p>
                    </div>
                    <Link
                      to={`/book/${trip.id}`}
                      className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition whitespace-nowrap"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSearching && results.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Search for available bus trips</p>
        </div>
      )}
    </div>
  );
}
