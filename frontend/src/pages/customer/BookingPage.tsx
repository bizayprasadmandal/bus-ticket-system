import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bus, User, CreditCard } from 'lucide-react';
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

export default function BookingPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [seatLayout, setSeatLayout] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const next = prev.includes(seat)
        ? prev.filter((s) => s !== seat)
        : [...prev, seat];
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        age: Number(p.age),
        gender: p.gender,
        id_type: p.id_type,
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
    return <div className="text-center py-16 text-gray-500">Loading trip details...</div>;
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Book Your Trip</h1>
        <p className="text-gray-500 mt-1">
          {trip.route?.origin_city} &rarr; {trip.route?.destination_city} &middot; {trip.trip_date}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Seats</h2>
            <div className="mb-4 flex gap-4 text-sm">
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-green-100 border border-green-400 rounded"></span> Available</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-blue-500 rounded"></span> Selected</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gray-300 rounded"></span> Occupied</span>
            </div>
            <div className="space-y-2">
              {Object.entries(rows).map(([row, seats]) => (
                <div key={row} className="flex items-center gap-2">
                  <span className="w-8 text-sm text-gray-500 font-medium">{row}</span>
                  <div className="flex gap-1.5">
                    {seats.map((seat: string) => {
                      const isOccupied = occupied.has(seat);
                      const isSelected = selectedSeats.includes(seat);
                      return (
                        <button
                          key={seat}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => toggleSeat(seat)}
                          className={`w-10 h-10 rounded text-xs font-semibold transition ${
                            isOccupied
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                          }`}
                        >
                          {seat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedSeats.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Passenger Details ({selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''})
              </h2>
              <div className="space-y-4">
                {selectedSeats.map((seat, i) => (
                  <div key={seat} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      <User className="inline h-4 w-4 mr-1" />
                      Passenger {i + 1} &middot; Seat {seat}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <input
                        placeholder="Full name"
                        value={passengers[i]?.name || ''}
                        onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <input
                        placeholder="Age"
                        type="number"
                        min={1}
                        max={120}
                        value={passengers[i]?.age || ''}
                        onChange={(e) => updatePassenger(i, 'age', Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <select
                        value={passengers[i]?.gender || ''}
                        onChange={(e) => updatePassenger(i, 'gender', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <select
                        value={passengers[i]?.id_type || 'citizenship'}
                        onChange={(e) => updatePassenger(i, 'id_type', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="citizenship">Citizenship</option>
                        <option value="passport">Passport</option>
                        <option value="license">License</option>
                      </select>
                      <input
                        placeholder="ID number"
                        value={passengers[i]?.id_number || ''}
                        onChange={(e) => updatePassenger(i, 'id_number', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Trip Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Bus className="h-4 w-4" />
                <span>{trip.bus?.bus_number} &middot; {trip.bus?.bus_type}</span>
              </div>
              <p className="font-medium text-gray-800">
                {trip.route?.origin_city} &rarr; {trip.route?.destination_city}
              </p>
              <p className="text-gray-600">Date: {trip.trip_date}</p>
              <p className="text-gray-600">Departure: {trip.departure_time}</p>
              <hr />
              <div className="flex justify-between">
                <span className="text-gray-600">Seats ({selectedSeats.length})</span>
                <span className="font-medium">{selectedSeats.join(', ') || '-'}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-blue-600">
                  Rs. {trip.current_fare * selectedSeats.length}
                </span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedSeats.length === 0}
              className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
