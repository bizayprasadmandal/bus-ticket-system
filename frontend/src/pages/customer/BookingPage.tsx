import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bus,
  Clock,
  MapPin,
  Star,
  Shield,
  Wifi,
  Plug,
  Snowflake,
  Phone,
  CreditCard,
  ChevronRight,
  AlertTriangle,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { tripAPI, bookingAPI, promoAPI } from '../../api';
import type { Trip } from '../../types';
import Dropdown from '../../components/Dropdown';
import toast from 'react-hot-toast';

interface Passenger {
  name: string;
  age: number | '';
  gender: string;
  id_type: string;
  id_number: string;
}

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

const ID_TYPE_MAP: Record<string, string> = {
  citizenship: 'CITIZENSHIP',
  passport: 'PASSPORT',
  license: 'DRIVING_LICENSE',
};

const EMPTY_PASSENGER: Passenger = {
  name: '',
  age: '',
  gender: '',
  id_type: 'citizenship',
  id_number: '',
};

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  wifi: Wifi,
  charging: Plug,
  ac: Snowflake,
  blanket: Shield,
  water: Star,
  snacks: Star,
};

export default function BookingPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [seatLayout, setSeatLayout] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phone, setPhone] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<Promo | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [showOffers, setShowOffers] = useState(false);

  useEffect(() => {
    // Offers are non-critical: fail silently.
    promoAPI
      .getActive()
      .then((res) => setPromos(res.data.data.promos || []))
      .catch(() => {});
  }, []);

  // Drop the code if seat changes push the fare below its minimum spend.
  useEffect(() => {
    if (!appliedPromo || !trip || selectedSeats.length === 0) return;
    const subtotal = (trip.current_fare || 0) * selectedSeats.length;
    if (subtotal < Number(appliedPromo.min_amount)) {
      const code = appliedPromo.code;
      setAppliedPromo(null);
      setPromoInput('');
      toast.error(`${code} removed — minimum spend not met`);
    }
  }, [appliedPromo, trip, selectedSeats.length]);

  // Mirrors services/promos.js computeDiscount so the preview matches the server.
  const promoDiscountFor = (promo: Promo, seats: number) => {
    const subtotal = Math.round(((trip?.current_fare || 0) * seats) * 100) / 100;
    const value = Number(promo.discount_value);
    const raw = promo.discount_type === 'percentage' ? (subtotal * value) / 100 : value;
    return Math.round(Math.min(Math.max(raw, 0), subtotal) * 100) / 100;
  };

  const applyPromo = (rawCode: string) => {
    const code = rawCode.toUpperCase().trim();
    if (!code) {
      toast.error('Enter a promo code');
      return;
    }
    const promo = promos.find((p) => p.code.toUpperCase() === code);
    if (!promo) {
      toast.error('Invalid, expired or fully redeemed code');
      return;
    }
    const subtotal = (trip?.current_fare || 0) * selectedSeats.length;
    if (subtotal < Number(promo.min_amount)) {
      toast.error(`This code needs a minimum spend of NPR ${Number(promo.min_amount).toLocaleString()}`);
      return;
    }
    setAppliedPromo(promo);
    setPromoInput(promo.code);
    setShowOffers(false);
    toast.success(`${promo.code} applied!`);
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
  };

  useEffect(() => {
    if (!tripId) return;
    const fetchData = async () => {
      try {
        const [tripRes, seatRes] = await Promise.all([
          tripAPI.getById(Number(tripId)),
          tripAPI.getSeats(Number(tripId)),
        ]);
        setTrip(tripRes.data.data.trip || tripRes.data.data);
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
    const next = selectedSeats.includes(seat)
      ? selectedSeats.filter((s) => s !== seat)
      : [...selectedSeats, seat];
    // preserve already-typed passenger details for seats that stay selected
    const bySeat: Record<string, Passenger> = {};
    selectedSeats.forEach((s, idx) => {
      if (passengers[idx]) bySeat[s] = passengers[idx];
    });
    setSelectedSeats(next);
    setPassengers(next.map((s) => bySeat[s] || { ...EMPTY_PASSENGER }));
  };

  const updatePassenger = (
    index: number,
    field: keyof Passenger,
    value: string | number
  ) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const canSubmit = () => {
    if (selectedSeats.length === 0) return false;
    if (trip && trip.status !== 'SCHEDULED') return false;
    return passengers.every((p) => p.name && p.age && p.gender && p.id_number);
  };

  const handleSubmit = async () => {
    if (trip && trip.status !== 'SCHEDULED') {
      toast.error('Trip is not available for booking');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }
    const incomplete = passengers.some(
      (p) => !p.name || !p.age || !p.gender || !p.id_number
    );
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
        gender: p.gender.toUpperCase(),
        id_type: ID_TYPE_MAP[p.id_type] || p.id_type.toUpperCase(),
        id_number: p.id_number,
        ...(i === 0 && phone ? { phone_number: phone } : {}),
      }));
      const response = await bookingAPI.create({
        trip_id: Number(tripId),
        passengers: passengerData,
        ...(appliedPromo ? { promo_code: appliedPromo.code } : {}),
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#d84e55]" />
        <p className="font-medium text-gray-500">Loading trip details...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="px-4 py-16 text-center text-gray-500">Trip not found</div>
    );
  }

  // --- Data mapping (FIXED) ---
  const layoutRows: string[][] = seatLayout?.seat_layout?.layout || [];
  const occupiedSet: Set<string> = new Set(seatLayout?.booked_seats || []);
  const fare = trip.current_fare || 0;

  const baseTotal = fare * selectedSeats.length;
  const gst = Math.round(baseTotal * 0.13 * 100) / 100;
  const serviceFee = 50 * selectedSeats.length;
  const discountAmount = appliedPromo ? promoDiscountFor(appliedPromo, selectedSeats.length) : 0;
  const totalAmount = Math.max(
    0,
    Math.round((baseTotal + gst + serviceFee - discountAmount) * 100) / 100
  );

  const rawAmenities = trip.bus?.amenities;
  const amenities: string[] = Array.isArray(rawAmenities)
    ? rawAmenities
    : typeof rawAmenities === 'string'
    ? (() => { try { return JSON.parse(rawAmenities); } catch { return []; } })()
    : [];

  return (
    <div>
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-6 py-2 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ==================== LEFT SIDE ==================== */}
        <div className="flex flex-col gap-5">
          {trip.status !== 'SCHEDULED' && (
            <div className="flex items-center gap-2.5 rounded-[10px] border border-amber-300 bg-amber-100 px-4 py-3.5 text-sm font-semibold text-amber-800">
              <AlertTriangle size={18} className="shrink-0" />
              This trip is not available for booking (status: {trip.status}).
            </div>
          )}

          {/* ---- SEAT SELECTION ---- */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Select your seats
            </h2>

            {/* Legend */}
            <div className="mb-5 flex flex-wrap gap-6 text-[13px] text-gray-600">
              <span className="flex items-center gap-2">
                <span className="h-7 w-6 rounded-md border-2 border-[#49c489] bg-white" />
                Available
              </span>
              <span className="flex items-center gap-2">
                <span className="h-7 w-6 rounded-md bg-[#49c489]" />
                Selected
              </span>
              <span className="flex items-center gap-2">
                <span className="h-7 w-6 rounded-md bg-gray-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.08)_3px,rgba(0,0,0,0.08)_5px)]" />
                Occupied
              </span>
            </div>

            {/* Bus visual */}
            <div className="max-w-[360px] rounded-xl border border-gray-200 bg-gray-50 p-5">
              {/* Driver area */}
              <div className="mb-4 flex items-center justify-center gap-2 border-b-2 border-dashed border-gray-200 pb-3">
                <span className="text-xl">🪑</span>
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400">
                  Driver
                </span>
              </div>

              {/* Seat grid */}
              <div className="flex flex-col gap-1.5">
                {layoutRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex items-center">
                    {/* Row number */}
                    <span className="w-6 shrink-0 text-center text-[11px] font-bold text-gray-400">
                      {rowIdx + 1}
                    </span>

                    {/* Seats in row */}
                    {row.map((seatId, seatIdx) => {
                      const isOccupied = occupiedSet.has(seatId);
                      const isSelected = selectedSeats.includes(seatId);
                      const isAisle = seatIdx === 1;

                      let seatClass =
                        'cursor-pointer border-2 border-[#49c489] bg-white text-gray-700';

                      if (isOccupied) {
                        seatClass =
                          'cursor-not-allowed border-2 border-gray-300 bg-gray-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.08)_3px,rgba(0,0,0,0.08)_5px)] text-gray-400';
                      } else if (isSelected) {
                        seatClass =
                          'cursor-pointer border-2 border-[#49c489] bg-[#49c489] text-white shadow-[0_2px_8px_rgba(73,196,137,0.4)]';
                      }

                      return (
                        <div
                          key={seatId}
                          className={isAisle ? 'mr-7' : 'mr-1'}
                        >
                          <button
                            type="button"
                            disabled={isOccupied}
                            onClick={() => toggleSeat(seatId)}
                            className={`flex h-[45px] w-10 items-center justify-center rounded-md text-[10px] font-bold transition-all duration-150 enabled:hover:scale-[1.08] enabled:active:scale-95 ${seatClass}`}
                          >
                            {seatId}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected seats badge */}
            {selectedSeats.length > 0 && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-[13px] font-medium text-green-700">
                {selectedSeats.length} seat
                {selectedSeats.length !== 1 ? 's' : ''} selected:{' '}
                {selectedSeats.join(', ')}
              </div>
            )}

            {/* Boarding & Dropping info */}
            {trip.route?.stops && trip.route.stops.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-8 text-[13px] text-gray-500">
                <div>
                  <span className="font-semibold text-gray-700">
                    Boarding:{' '}
                  </span>
                  {trip.route.origin_city}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    Dropping:{' '}
                  </span>
                  {trip.route.destination_city}
                </div>
              </div>
            )}
          </div>

          {/* ---- PASSENGER DETAILS ---- */}
          {selectedSeats.length > 0 && (
            <div className="card p-6">
              <h2 className="mb-5 text-lg font-bold text-gray-900">
                Passenger Details
              </h2>

              {/* Contact details */}
              <div className="mb-6">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Contact Details
                </h3>
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-1 basis-full items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                      <Phone size={16} />
                    </span>
                    <input
                      type="tel"
                      placeholder="Contact phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="field"
                    />
                  </div>
                </div>
              </div>

              {/* Passenger forms */}
              <div className="flex flex-col gap-4">
                {selectedSeats.map((seat, i) => (
                  <div
                    key={seat}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
                  >
                    {/* Passenger header */}
                    <div className="mb-3.5 flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d84e55] text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        Passenger {i + 1} &middot; Seat{' '}
                        <span className="text-[#d84e55]">{seat}</span>
                      </span>
                    </div>

                    {/* Fields row */}
                    <div className="grid grid-cols-2 items-start gap-2.5 md:grid-cols-[1fr_80px_1fr_1fr]">
                      {/* Name */}
                      <input
                        placeholder="Full name"
                        value={passengers[i]?.name || ''}
                        onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                        className="field"
                      />

                      {/* Age */}
                      <input
                        placeholder="Age"
                        type="number"
                        min={1}
                        max={120}
                        value={passengers[i]?.age || ''}
                        onChange={(e) =>
                          updatePassenger(i, 'age', Number(e.target.value))
                        }
                        className="field"
                      />

                      {/* Gender pills */}
                      <div className="flex gap-1.5">
                        {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => {
                          const active = passengers[i]?.gender === g;
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => updatePassenger(i, 'gender', g)}
                              className={`rounded-full px-2.5 py-2 text-[11px] font-semibold transition-all duration-150 ${
                                active
                                  ? 'border-2 border-[#d84e55] bg-[#fef2f2] text-[#d84e55]'
                                  : 'border border-gray-200 bg-white text-gray-500 hover:border-[#f5c6c9] hover:text-[#b53d43]'
                              }`}
                            >
                              {g === 'MALE' ? 'M' : g === 'FEMALE' ? 'F' : 'O'}
                            </button>
                          );
                        })}
                      </div>

                      {/* ID Type + Number */}
                      <div className="flex gap-1.5">
                        <Dropdown
                          value={passengers[i]?.id_type || 'citizenship'}
                          onChange={(val) => updatePassenger(i, 'id_type', val)}
                          options={[
                            { value: 'citizenship', label: 'Citizenship' },
                            { value: 'passport', label: 'Passport' },
                            { value: 'license', label: 'License' },
                          ]}
                          placeholder="Select ID type"
                          className="flex-1"
                        />
                        <input
                          placeholder="ID number"
                          value={passengers[i]?.id_number || ''}
                          onChange={(e) =>
                            updatePassenger(i, 'id_number', e.target.value)
                          }
                          className="field min-w-0 flex-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==================== RIGHT SIDE (STICKY SIDEBAR) ==================== */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {/* Trip Info Card */}
          <div className="card overflow-hidden">
            {/* Brand gradient header */}
            <div className="bg-gradient-to-br from-[#7f2a2f] via-[#d84e55] to-[#e7565d] px-5 py-4 text-white">
              <div className="mb-1 flex items-center gap-2">
                <Bus size={18} />
                <span className="text-[15px] font-bold">
                  {trip.bus?.bus_type || 'Standard'}
                </span>
              </div>
              <span className="text-xs text-white/85">
                {trip.bus?.bus_number}
              </span>
              {trip.operator?.company_name && (
                <div className="mt-0.5 text-xs text-white/85">
                  {trip.operator.company_name}
                </div>
              )}
            </div>

            {/* Route visual */}
            <div className="p-5">
              <div className="flex items-start gap-3">
                {/* Timeline dots */}
                <div className="flex flex-col items-center pt-1">
                  <div className="h-3 w-3 rounded-full border-[3px] border-[#d84e55] bg-white" />
                  <div className="h-10 border-l-2 border-dashed border-gray-300" />
                  <div className="h-3 w-3 rounded-full bg-[#49c489]" />
                </div>

                {/* Cities + times */}
                <div className="flex-1">
                  <div className="mb-7">
                    <p className="text-xl font-bold text-gray-900">
                      {trip.departure_time?.substring(0, 5)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-gray-500">
                      {trip.route?.origin_city}
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {trip.arrival_time?.substring(0, 5)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-gray-500">
                      {trip.route?.destination_city}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date + duration */}
              <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-[13px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {trip.trip_date}
                </span>
                {trip.route?.estimated_duration_minutes ? (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />{' '}
                    {Math.floor(trip.route.estimated_duration_minutes / 60)}h{' '}
                    {trip.route.estimated_duration_minutes % 60}m
                  </span>
                ) : trip.route?.estimated_duration ? (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {trip.route.estimated_duration}
                  </span>
                ) : null}
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {amenities.map((a) => {
                    const Icon = AMENITY_ICONS[a.toLowerCase()] || Star;
                    return (
                      <div
                        key={a}
                        title={a}
                        className="flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500"
                      >
                        <Icon size={12} />
                        {a}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Promo Code Card */}
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-lg font-bold text-gray-900">
              <Tag size={15} className="text-[#d84e55]" />
              Offers
            </h3>

            {appliedPromo ? (
              <div className="flex items-center justify-between gap-2 rounded-[10px] border border-green-200 bg-green-50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-green-600" />
                  <div>
                    <p className="text-[13px] font-bold text-green-800">
                      {appliedPromo.code} applied
                    </p>
                    {discountAmount > 0 && (
                      <p className="text-[11px] text-lime-700">
                        You save NPR {discountAmount.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removePromo}
                  className="shrink-0 text-xs font-bold text-red-600 transition-colors hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    className="field min-w-0 flex-1 font-mono tracking-[0.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => applyPromo(promoInput)}
                    className="btn-primary"
                  >
                    APPLY
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOffers((v) => !v)}
                  className="mt-2 text-xs font-semibold text-[#d84e55] transition-colors hover:text-[#b53d43]"
                >
                  {showOffers ? 'Hide offers' : `View all offers (${promos.length})`}
                </button>
                {showOffers && (
                  <div className="mt-2 flex max-h-[200px] flex-col gap-2 overflow-y-auto">
                    {promos.length === 0 && (
                      <p className="text-xs text-gray-400">
                        No offers available right now
                      </p>
                    )}
                    {promos.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-[10px] border border-gray-100 px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[#d84e55]">
                            {p.discount_type === 'percentage'
                              ? `${Number(p.discount_value)}% OFF`
                              : `NPR ${Number(p.discount_value).toLocaleString()} OFF`}
                          </p>
                          <p className="truncate text-[11px] text-gray-500">
                            {p.description || p.code} · min NPR{' '}
                            {Number(p.min_amount).toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyPromo(p.code)}
                          className="shrink-0 rounded-lg border border-[#f2c4c6] bg-white px-2.5 py-1 text-xs font-bold text-[#d84e55] transition-colors hover:bg-[#fef2f2]"
                        >
                          APPLY
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fare Summary Card */}
          <div className="card p-5">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              Fare Summary
            </h3>

            {selectedSeats.length > 0 ? (
              <div>
                <div className="mb-2 flex justify-between gap-3 text-sm text-gray-500">
                  <span>
                    Base fare ({selectedSeats.length} × NPR{' '}
                    {Number(fare).toLocaleString()})
                  </span>
                  <span className="font-semibold text-gray-700">
                    NPR {Number(baseTotal).toLocaleString()}
                  </span>
                </div>
                <div className="mb-2 flex justify-between gap-3 text-sm text-gray-500">
                  <span>GST (est. 13%)</span>
                  <span className="font-semibold text-gray-700">
                    NPR {Number(gst).toLocaleString()}
                  </span>
                </div>
                <div className="mb-3 flex justify-between gap-3 text-sm text-gray-500">
                  <span>Service fee ({selectedSeats.length} × NPR 50)</span>
                  <span className="font-semibold text-gray-700">
                    NPR {Number(serviceFee).toLocaleString()}
                  </span>
                </div>
                {appliedPromo && discountAmount > 0 && (
                  <div className="mb-3 flex justify-between gap-3 text-sm text-green-600">
                    <span>Promo ({appliedPromo.code})</span>
                    <span className="font-semibold">
                      - NPR {Number(discountAmount).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="border-t border-dashed border-gray-200 pt-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fef2f2] p-3">
                    <span className="text-sm font-bold text-gray-900">
                      Total
                    </span>
                    <span className="text-2xl font-extrabold text-[#d84e55]">
                      NPR {Number(totalAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-5 text-center text-[13px] text-gray-400">
                Select seats to see fare details
              </p>
            )}

            {/* Proceed button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit() || isSubmitting}
              className={`mt-4 w-full sm:w-auto ${
                canSubmit() && !isSubmitting
                  ? 'btn-primary'
                  : 'inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-[0.875rem] bg-gray-200 px-6 py-3 text-sm font-semibold text-gray-500'
              }`}
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  <CreditCard size={18} />
                  {selectedSeats.length > 0
                    ? `Proceed to Pay · NPR ${Number(totalAmount).toLocaleString()}`
                    : 'Proceed to Pay'}
                  {selectedSeats.length > 0 && (
                    <ChevronRight size={18} />
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
