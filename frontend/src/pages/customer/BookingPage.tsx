import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bus, CreditCard, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { tripAPI, bookingAPI } from '../../api';
import type { Trip } from '../../types';
import toast from 'react-hot-toast';

interface Passenger {
  name: string;
  age: number | '';
  gender: string;
  id_type: string;
  id_number: string;
}

const steps = ['Select Seats', 'Passenger Details', 'Review & Pay'];

export default function BookingPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [seatLayout, setSeatLayout] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!tripId) return;
    const fetchData = async () => {
      try {
        const [tripRes, seatRes] = await Promise.all([
          tripAPI.getById(Number(tripId)),
          tripAPI.getSeats(Number(tripId)),
        ]);
        setTrip(tripRes.data.data);
        setSeatLayout(seatRes.data.data);
      } catch {
        toast.error('Failed to load trip details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [tripId]);

  const toggleSeat = (seat: string) => {
    setSelectedSeats((prev) => {
      const next = prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat];
      setPassengers(next.map(() => ({ name: '', age: '', gender: '', id_type: 'citizenship', id_number: '' })));
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

  const canProceed = () => {
    if (currentStep === 0) return selectedSeats.length > 0;
    if (currentStep === 1) {
      return passengers.every((p) => p.name && p.age && p.gender && p.id_number);
    }
    return true;
  };

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
      const idTypeMap: Record<string, string> = { citizenship: 'CITIZENSHIP', passport: 'PASSPORT', license: 'DRIVING_LICENSE' };
      const passengerData = passengers.map((p, i) => ({
        seat_number: selectedSeats[i],
        passenger_name: p.name,
        age: Number(p.age),
        gender: p.gender.toUpperCase(),
        id_type: idTypeMap[p.id_type] || p.id_type.toUpperCase(),
        id_number: p.id_number,
      }));
      const response = await bookingAPI.create({
        trip_id: Number(tripId),
        passengers: passengerData,
      });
      const bookingId = response.data.data.booking.id;
      toast.success('Booking created! Proceed to payment.');
      navigate(`/payment/${bookingId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading trip details...</p>
      </div>
    );
  }

  if (!trip) {
    return <div className="text-center py-16 text-gray-500">Trip not found</div>;
  }

  const rows: Record<string, string[]> = {};
  const occupied: Set<string> = new Set(seatLayout?.occupied_seats || []);
  if (seatLayout?.layout) {
    Object.entries(seatLayout.layout).forEach(([row, seats]: [string, any]) => {
      rows[row] = Array.isArray(seats) ? seats : [];
    });
  }

  const fare = trip.current_fare || 0;

  return (
    <div>
      {/* Step Progress */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  i < currentStep
                    ? 'bg-green-500 text-white'
                    : i === currentStep
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {i < currentStep ? <Check className="h-5 w-5" /> : i + 1}
                </div>
                <span className={`text-xs mt-2 font-medium hidden sm:block ${
                  i <= currentStep ? 'text-gray-800' : 'text-gray-400'
                }`}>{step}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-3 rounded-full mt-[-16px] sm:mt-0 ${
                  i < currentStep ? 'bg-green-500' : 'bg-gray-100'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Step 0: Seat Selection */}
          {currentStep === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Select Your Seats</h2>
              <div className="mb-6 flex gap-6 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-primary-50 border-2 border-primary-300 rounded-md" />
                  Available
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-primary-600 rounded-md" />
                  Selected
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-gray-200 rounded-md" />
                  Occupied
                </span>
              </div>

              {/* Bus visual */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gray-300 text-gray-600 px-8 py-2 rounded-t-2xl text-xs font-bold tracking-widest uppercase">
                    Front
                  </div>
                </div>
                <div className="space-y-2 max-w-xs mx-auto">
                  {Object.entries(rows).map(([row, seats]) => (
                    <div key={row} className="flex items-center gap-3">
                      <span className="w-6 text-xs text-gray-400 font-bold">{row}</span>
                      <div className="flex gap-1.5 flex-1 justify-center">
                        {seats.map((seat: string, idx: number) => {
                          const isOccupied = occupied.has(seat);
                          const isSelected = selectedSeats.includes(seat);
                          const isAisle = idx === 1;
                          return (
                            <div key={seat} className={isAisle ? 'mr-4' : ''}>
                              <button
                                type="button"
                                disabled={isOccupied}
                                onClick={() => toggleSeat(seat)}
                                className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                                  isOccupied
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                                    : isSelected
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 scale-110'
                                    : 'bg-white text-primary-700 border-2 border-primary-200 hover:border-primary-400 hover:bg-primary-50'
                                }`}
                              >
                                {seat}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSeats.length > 0 && (
                <div className="mt-4 p-3 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-sm text-primary-700 font-medium">
                    {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected: {selectedSeats.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Passenger Details */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Passenger Details ({selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''})
              </h2>
              <div className="space-y-4">
                {selectedSeats.map((seat, i) => (
                  <div key={seat} className="border border-gray-200 rounded-xl p-5 bg-gray-50/50">
                    <p className="text-sm font-bold text-primary-700 mb-3 flex items-center gap-2">
                      <span className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-xs">{i + 1}</span>
                      Passenger {i + 1} &middot; Seat {seat}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <input
                        placeholder="Full name"
                        value={passengers[i]?.name || ''}
                        onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        required
                      />
                      <input
                        placeholder="Age"
                        type="number"
                        min={1}
                        max={120}
                        value={passengers[i]?.age || ''}
                        onChange={(e) => updatePassenger(i, 'age', Number(e.target.value))}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        required
                      />
                      <select
                        value={passengers[i]?.gender || ''}
                        onChange={(e) => updatePassenger(i, 'gender', e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white appearance-none"
                        required
                      >
                        <option value="">Gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <div className="flex gap-2">
                        <select
                          value={passengers[i]?.id_type || 'citizenship'}
                          onChange={(e) => updatePassenger(i, 'id_type', e.target.value)}
                          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white appearance-none"
                        >
                          <option value="citizenship">Citizenship</option>
                          <option value="passport">Passport</option>
                          <option value="license">License</option>
                        </select>
                        <input
                          placeholder="ID number"
                          value={passengers[i]?.id_number || ''}
                          onChange={(e) => updatePassenger(i, 'id_number', e.target.value)}
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Review Your Booking</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Bus className="h-5 w-5 text-primary-600" />
                    <span className="font-bold text-gray-800">{trip.bus?.bus_number} &middot; {trip.bus?.bus_type}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-800">{trip.departure_time?.substring(0, 5)}</p>
                      <p className="text-xs text-gray-500">{trip.route?.origin_city}</p>
                    </div>
                    <div className="flex-1 h-[2px] bg-gray-300 relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary-500 rounded-full" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full" />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-800">{trip.arrival_time?.substring(0, 5)}</p>
                      <p className="text-xs text-gray-500">{trip.route?.destination_city}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Passengers</h3>
                  <div className="space-y-2">
                    {passengers.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-500">Seat {selectedSeats[i]} &middot; {p.age} yrs &middot; {p.gender}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-4">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {currentStep < 2 ? (
              <button
                onClick={() => canProceed() && setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/25"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg shadow-green-600/25"
              >
                <CreditCard className="h-4 w-4" />
                {isSubmitting ? 'Processing...' : `Pay NPR ${Math.round((fare * selectedSeats.length * 1.13 + 50 * selectedSeats.length) * 100) / 100}`}
              </button>
            )}
          </div>
        </div>

        {/* Trip Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Trip Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Bus className="h-4 w-4 text-primary-500" />
                <span className="font-medium">{trip.bus?.bus_number} &middot; {trip.bus?.bus_type}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="font-bold text-gray-800">{trip.route?.origin_city} → {trip.route?.destination_city}</p>
                <p className="text-xs text-gray-500 mt-1">{trip.trip_date} &middot; {trip.departure_time?.substring(0, 5)}</p>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between">
                <span className="text-gray-500">Seats ({selectedSeats.length})</span>
                <span className="font-bold text-gray-800">{selectedSeats.join(', ') || '-'}</span>
              </div>
              <div className="bg-primary-50 rounded-xl p-4 mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Base fare</span>
                  <span className="font-medium">NPR {fare} × {selectedSeats.length}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Tax (13%)</span>
                  <span className="font-medium">NPR {Math.round(fare * selectedSeats.length * 0.13 * 100) / 100}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Service fee</span>
                  <span className="font-medium">NPR {50 * selectedSeats.length}</span>
                </div>
                <hr className="border-primary-100 my-2" />
                <div className="flex justify-between">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="text-xl font-bold text-primary-600">
                    NPR {Math.round((fare * selectedSeats.length * 1.13 + 50 * selectedSeats.length) * 100) / 100}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
