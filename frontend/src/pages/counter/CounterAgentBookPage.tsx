import { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  ArrowLeftRight,
  ChevronDown,
  Bus,
  Clock,
  ChevronRight,
  Loader2,
  CreditCard,
  CheckCircle,
  Banknote,
  Printer,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { tripAPI, cityAPI } from '../../api';
import type { City, Trip } from '../../types';
import toast from 'react-hot-toast';

interface Passenger {
  name: string;
  phone: string;
  age: number | '';
  gender: string;
  id_type: string;
  id_number: string;
}

const ID_TYPES = [
  { value: 'CITIZENSHIP', label: 'Citizenship' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
];

function CityDropdown({
  cities,
  value,
  onChange,
  placeholder,
}: {
  cities: City[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilter(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = cities.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div ref={(ref as any)[0]} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 pr-8 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        />
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
          {filtered.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => {
                onChange(city.name);
                setFilter(city.name);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left"
            >
              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="flex-1">{city.name}</span>
              {city.province && <span className="text-xs text-gray-400">{city.province}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CounterAgentBookPage() {
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<Trip[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [seatLayout, setSeatLayout] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'search' | 'select' | 'book' | 'confirm' | 'success'>('search');
  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => {
    cityAPI
      .getAll()
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
    if (!origin || !destination) {
      toast.error('Please select both cities');
      return;
    }
    setIsSearching(true);
    try {
      const res = await tripAPI.search({
        origin_city: origin,
        destination_city: destination,
        trip_date: tripDate,
      });
      setResults(res.data.data.trips || res.data.data);
      setStep('select');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectTrip = async (trip: Trip) => {
    setSelectedTrip(trip);
    try {
      const seatRes = await tripAPI.getSeats(trip.id);
      setSeatLayout(seatRes.data.data);
      setSelectedSeats([]);
      setPassengers([]);
      setStep('book');
    } catch {
      toast.error('Failed to load seat layout');
    }
  };

  const toggleSeat = (seat: string) => {
    setSelectedSeats((prev) => {
      const next = prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat];
      setPassengers(
        next.map(() => ({
          name: '',
          phone: '',
          age: '',
          gender: '',
          id_type: 'CITIZENSHIP',
          id_number: '',
        }))
      );
      return next;
    });
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: string | number) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const canSubmit = () => {
    if (selectedSeats.length === 0) return false;
    return passengers.every((p) => p.name && p.age && p.gender && p.id_number);
  };

  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const handleSubmit = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }
    const incomplete = passengers.some((p) => !p.name || !p.age || !p.gender || !p.id_number);
    if (incomplete) {
      toast.error('Please fill in all passenger details');
      return;
    }
    setIsSubmitting(true);
    try {
      const passengerData = passengers.map((p, i) => ({
        seat_number: selectedSeats[i],
        passenger_name: p.name,
        phone: p.phone,
        age: Number(p.age),
        gender: p.gender.toUpperCase(),
        id_type: p.id_type,
        id_number: p.id_number,
      }));
      const response = await api.post('/bookings', {
        trip_id: Number(selectedTrip!.id),
        passengers: passengerData,
      });
      setBookingResult(response.data.data.booking);
      setStep('confirm');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashPayment = async () => {
    if (!bookingResult || !selectedTrip) return;
    setPaymentProcessing(true);
    try {
      const passengerData = passengers.map((p, i) => ({
        seat_number: selectedSeats[i],
        passenger_name: p.name,
        phone: p.phone,
        age: Number(p.age),
        gender: p.gender.toUpperCase(),
        id_type: p.id_type,
        id_number: p.id_number,
      }));
      const response = await api.post('/bookings/cash-payment', {
        trip_id: Number(selectedTrip.id),
        passengers: passengerData,
        passenger_name: passengers[0]?.name || '',
        passenger_phone: passengers[0]?.phone || '',
      });
      setBookingResult((prev: any) => ({
        ...prev,
        ...response.data.data.booking,
        payment_status: 'PAID',
        booking_status: 'CONFIRMED',
      }));
      setStep('success');
      toast.success('Cash payment recorded successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Payment processing failed');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handlePrintTicket = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !bookingResult || !selectedTrip) return;
    const pnr = bookingResult.pnr || bookingResult.id;
    const route = `${selectedTrip.route?.origin_city} → ${selectedTrip.route?.destination_city}`;
    const date = selectedTrip.trip_date;
    const time = selectedTrip.departure_time;
    const bus = `${selectedTrip.bus?.bus_type} (${selectedTrip.bus?.bus_number})`;
    const passengerRows = passengers
      .map(
        (p, i) =>
          `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${i + 1}</td><td style="padding:4px 8px;border:1px solid #ddd;">${p.name}</td><td style="padding:4px 8px;border:1px solid #ddd;">${selectedSeats[i]}</td><td style="padding:4px 8px;border:1px solid #ddd;">${p.phone || '-'}</td></tr>`
      )
      .join('');
    printWindow.document.write(`
      <html><head><title>Ticket - ${pnr}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .ticket { max-width: 400px; margin: 0 auto; border: 2px solid #d84e55; padding: 16px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px dashed #d84e55; padding-bottom: 12px; margin-bottom: 12px; }
        .header h1 { margin: 0; color: #d84e55; font-size: 22px; }
        .header p { margin: 4px 0 0; color: #666; font-size: 12px; }
        .stamp { text-align: center; margin: 12px 0; }
        .stamp span { display: inline-block; border: 3px solid #16a34a; color: #16a34a; font-size: 18px; font-weight: bold; padding: 4px 16px; border-radius: 4px; transform: rotate(-5deg); }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
        th { background: #f3f4f6; padding: 4px 8px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
        .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .info-row span:first-child { color: #666; }
        .total { text-align: right; font-size: 18px; font-weight: bold; color: #d84e55; margin-top: 8px; border-top: 2px solid #d84e55; padding-top: 8px; }
        .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #999; }
      </style></head><body>
      <div class="ticket">
        <div class="header">
          <h1>Gadi Yatra</h1>
          <p>Bus Ticket</p>
        </div>
        <div class="info-row"><span>PNR</span><strong>${pnr}</strong></div>
        <div class="info-row"><span>Route</span><strong>${route}</strong></div>
        <div class="info-row"><span>Date</span><strong>${date}</strong></div>
        <div class="info-row"><span>Time</span><strong>${time}</strong></div>
        <div class="info-row"><span>Bus</span><strong>${bus}</strong></div>
        <table>
          <thead><tr><th>#</th><th>Passenger</th><th>Seat</th><th>Phone</th></tr></thead>
          <tbody>${passengerRows}</tbody>
        </table>
        <div class="total">Total: NPR ${bookingResult.total_amount?.toLocaleString()}</div>
        <div class="stamp"><span>PAID - CASH</span></div>
        <div class="footer">Thank you for traveling with us!</div>
      </div>
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const resetBooking = () => {
    setStep('search');
    setResults([]);
    setSelectedTrip(null);
    setSeatLayout(null);
    setSelectedSeats([]);
    setPassengers([]);
    setBookingResult(null);
    setOrigin('');
    setDestination('');
    setTripDate(new Date().toISOString().split('T')[0]);
  };

  const fare = selectedTrip?.current_fare || 0;
  const baseTotal = fare * selectedSeats.length;
  const gst = Math.round(baseTotal * 0.13 * 100) / 100;
  const serviceFee = 50 * selectedSeats.length;
  const totalAmount = Math.round((baseTotal + gst + serviceFee) * 100) / 100;

  const layoutRows: string[][] = seatLayout?.seat_layout?.layout || [];
  const occupiedSet: Set<string> = new Set(seatLayout?.booked_seats || []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Book Ticket</h1>
          <p className="text-sm text-gray-500 mt-1">Search and book bus tickets for passengers at the counter.</p>
        </div>
        {step !== 'search' && (
          <button
            onClick={resetBooking}
            className="px-4 py-2 text-sm text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
          >
            New Booking
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {['search', 'select', 'book', 'confirm'].map((s, i) => {
          const labels: Record<string, string> = { search: 'Search', select: 'Select Trip', book: 'Book Seats', confirm: 'Payment' };
          const isActive = step === s;
          const isDone = ['search', 'select', 'book', 'confirm', 'success'].indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${isDone || isActive ? 'bg-amber-400' : 'bg-gray-200'}`} />}
              <div className={`flex items-center gap-1.5 ${isActive ? 'text-amber-600 font-semibold' : isDone ? 'text-amber-500' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-amber-600 text-white' : isDone ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                  {isDone ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {labels[s]}
              </div>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Search */}
      {step === 'search' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                  <CityDropdown cities={cities} value={origin} onChange={setOrigin} placeholder="Select origin city" />
                </div>
              </div>
              <div className="hidden lg:flex items-center justify-center pb-1">
                <button type="button" onClick={swapCities} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:border-amber-300 transition-colors">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">To</label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500 shrink-0" />
                  <CityDropdown cities={cities} value={destination} onChange={setDestination} placeholder="Select destination city" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="w-full px-6 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {isSearching ? 'Searching...' : 'Search Buses'}
              </button>
            </div>
          </form>

          {/* Search Results */}
          {results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{results.length} buses found</h3>
              <div className="space-y-3">
                {results.map((trip) => (
                  <div key={trip.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                      <Bus className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-800">{trip.route?.origin_city}</span>
                        <ChevronRight className="h-3 w-3 text-gray-400" />
                        <span className="font-medium text-gray-800">{trip.route?.destination_city}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {trip.departure_time}</span>
                        <span>{trip.bus?.bus_number}</span>
                        <span>{trip.bus?.bus_type}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">NPR {trip.current_fare}</p>
                      <p className={`text-xs font-medium ${trip.available_seats <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                        {trip.available_seats} seats
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectTrip(trip)}
                      className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors shrink-0"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 'search' && results.length === 0 && !isSearching && (
            <div className="text-center py-8">
              <Bus className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Search for available buses to begin booking</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Select Seats */}
      {step === 'book' && selectedTrip && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seat Layout */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Seats</h3>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 border-2 border-amber-500 rounded bg-white" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-amber-500 rounded" /> Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-gray-300 rounded" /> Occupied
                </span>
              </div>

              {/* Seat Grid */}
              <div className="bg-gray-50 rounded-lg p-4 max-w-sm">
                {layoutRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex items-center gap-1 mb-1">
                    <span className="w-6 text-center text-xs font-bold text-gray-400">{rowIdx + 1}</span>
                    {row.map((seatId, seatIdx) => {
                      const isOccupied = occupiedSet.has(seatId);
                      const isSelected = selectedSeats.includes(seatId);
                      const isAisle = seatIdx === 1;
                      return (
                        <div key={seatId} style={{ marginRight: isAisle ? '16px' : '3px' }}>
                          <button
                            type="button"
                            disabled={isOccupied}
                            onClick={() => toggleSeat(seatId)}
                            className={`w-9 h-9 rounded text-xs font-bold transition-all ${
                              isOccupied
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : isSelected
                                ? 'bg-amber-500 text-white shadow-md'
                                : 'bg-white border-2 border-amber-400 text-gray-700 hover:border-amber-500'
                            }`}
                          >
                            {seatId}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {selectedSeats.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700 font-medium">
                  {selectedSeats.length} seat(s) selected: {selectedSeats.join(', ')}
                </div>
              )}
            </div>

            {/* Passenger Details */}
            {selectedSeats.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Passenger Details</h3>
                <div className="space-y-4">
                  {selectedSeats.map((seat, i) => (
                    <div key={seat} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
                        <span className="text-sm font-semibold text-gray-700">Passenger {i + 1} &middot; Seat <span className="text-amber-600">{seat}</span></span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <input
                          placeholder="Full name"
                          value={passengers[i]?.name || ''}
                          onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <input
                          placeholder="Phone"
                          value={passengers[i]?.phone || ''}
                          onChange={(e) => updatePassenger(i, 'phone', e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <input
                          placeholder="Age"
                          type="number"
                          min={1}
                          max={120}
                          value={passengers[i]?.age || ''}
                          onChange={(e) => updatePassenger(i, 'age', Number(e.target.value))}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <select
                          value={passengers[i]?.gender || ''}
                          onChange={(e) => updatePassenger(i, 'gender', e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-white"
                        >
                          <option value="">Gender</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <div className="flex gap-1">
                          <select
                            value={passengers[i]?.id_type || 'CITIZENSHIP'}
                            onChange={(e) => updatePassenger(i, 'id_type', e.target.value)}
                            className="px-2 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500 bg-white"
                          >
                            {ID_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          <input
                            placeholder="ID Number"
                            value={passengers[i]?.id_number || ''}
                            onChange={(e) => updatePassenger(i, 'id_number', e.target.value)}
                            className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500 min-w-0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                  <Bus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{selectedTrip.bus?.bus_type}</p>
                  <p className="text-xs text-gray-500">{selectedTrip.bus?.bus_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 text-sm">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium">{selectedTrip.route?.origin_city}</span>
                <ChevronRight className="h-3 w-3 text-gray-400" />
                <span className="font-medium">{selectedTrip.route?.destination_city}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <Clock className="h-3 w-3" /> {selectedTrip.departure_time} &middot; {selectedTrip.trip_date}
              </div>

              {selectedSeats.length > 0 && (
                <div className="space-y-2 text-sm mb-4 pb-4 border-b border-gray-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Base fare ({selectedSeats.length} x NPR {fare})</span>
                    <span className="font-medium">NPR {baseTotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST (13%)</span>
                    <span className="font-medium">NPR {gst}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Service fee ({selectedSeats.length} x NPR 50)</span>
                    <span className="font-medium">NPR {serviceFee}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-amber-600">NPR {totalAmount}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit() || isSubmitting}
                className="w-full py-3 bg-amber-600 text-white font-bold text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="h-4 w-4" /> Confirm Booking</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Cash Payment */}
      {step === 'confirm' && bookingResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Banknote className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Collect Cash Payment</h2>
            <p className="text-sm text-gray-500">Confirm the booking and collect cash from the passenger.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">PNR Number</span>
              <span className="font-mono font-bold text-amber-600">{bookingResult.pnr}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Route</span>
              <span className="font-medium text-gray-800">{selectedTrip?.route?.origin_city} → {selectedTrip?.route?.destination_city}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date & Time</span>
              <span className="font-medium text-gray-800">{selectedTrip?.trip_date} {selectedTrip?.departure_time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Passengers</span>
              <span className="font-medium text-gray-800">{selectedSeats.length}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center mb-6">
            <p className="text-sm text-amber-700 mb-1">Total Amount to Collect</p>
            <p className="text-3xl font-bold text-amber-600">NPR {totalAmount.toLocaleString()}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetBooking}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCashPayment}
              disabled={paymentProcessing}
              className="flex-1 py-2.5 bg-green-600 text-white font-bold text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {paymentProcessing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><Banknote className="h-4 w-4" /> Collect Cash</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Success with Print */}
      {step === 'success' && bookingResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Received!</h2>
          <p className="text-sm text-gray-500 mb-6">Cash payment recorded. Ticket is confirmed.</p>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">PNR Number</span>
              <span className="font-mono font-bold text-amber-600">{bookingResult.pnr}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-bold text-gray-800">NPR {bookingResult.total_amount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment</span>
              <span className="font-medium text-green-600">PAID - CASH</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-green-600">CONFIRMED</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrintTicket}
              className="flex-1 py-2.5 bg-amber-600 text-white font-bold text-sm rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" /> Print Ticket
            </button>
            <button
              onClick={resetBooking}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Book Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
