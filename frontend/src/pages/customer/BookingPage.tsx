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
  Mail,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { tripAPI, bookingAPI } from '../../api';
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

const ID_TYPE_MAP: Record<string, string> = {
  citizenship: 'CITIZENSHIP',
  passport: 'PASSPORT',
  license: 'DRIVING_LICENSE',
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
  const [email, setEmail] = useState('');

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
    setSelectedSeats((prev) => {
      const next = prev.includes(seat)
        ? prev.filter((s) => s !== seat)
        : [...prev, seat];
      setPassengers(
        next.map(() => ({
          name: '',
          age: '',
          gender: '',
          id_type: 'citizenship',
          id_number: '',
        }))
      );
      return next;
    });
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
    return passengers.every((p) => p.name && p.age && p.gender && p.id_number);
  };

  const handleSubmit = async () => {
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
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#d84e55',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#6b7280', fontWeight: 500, fontFamily: 'Inter' }}>
          Loading trip details...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!trip) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '64px 16px',
          color: '#6b7280',
          fontFamily: 'Inter',
        }}
      >
        Trip not found
      </div>
    );
  }

  // --- Data mapping (FIXED) ---
  const layoutRows: string[][] = seatLayout?.seat_layout?.layout || [];
  const occupiedSet: Set<string> = new Set(seatLayout?.booked_seats || []);
  const fare = trip.current_fare || 0;

  const baseTotal = fare * selectedSeats.length;
  const gst = Math.round(baseTotal * 0.13 * 100) / 100;
  const serviceFee = 50 * selectedSeats.length;
  const totalAmount = Math.round((baseTotal + gst + serviceFee) * 100) / 100;

  const rawAmenities = trip.bus?.amenities;
  const amenities: string[] = Array.isArray(rawAmenities)
    ? rawAmenities
    : typeof rawAmenities === 'string'
    ? (() => { try { return JSON.parse(rawAmenities); } catch { return []; } })()
    : [];

  return (
    <div style={{ background: '#f0f0f0', minHeight: '100vh', fontFamily: 'Inter' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .seat-btn { transition: all 0.15s ease; }
        .seat-btn:hover:not(:disabled) { transform: scale(1.08); }
        .seat-btn:active:not(:disabled) { transform: scale(0.95); }
      `}</style>

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px 16px',
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ==================== LEFT SIDE ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ---- SEAT SELECTION ---- */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              padding: '24px',
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1a1a2e',
                marginBottom: '16px',
                fontFamily: 'Poppins',
              }}
            >
              Select your seats
            </h2>

            {/* Legend */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#555',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '24px',
                    height: '28px',
                    border: '2px solid #49c489',
                    borderRadius: '6px',
                    background: '#fff',
                  }}
                />
                Available
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '24px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#49c489',
                  }}
                />
                Selected
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '24px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#d1d5db',
                    backgroundImage:
                      'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 5px)',
                  }}
                />
                Occupied
              </span>
            </div>

            {/* Bus visual */}
            <div
              style={{
                background: '#fafafa',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                maxWidth: '360px',
              }}
            >
              {/* Driver area */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '2px dashed #e5e7eb',
                }}
              >
                <span style={{ fontSize: '20px' }}>🪑</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#9ca3af',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  Driver
                </span>
              </div>

              {/* Seat grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {layoutRows.map((row, rowIdx) => (
                  <div
                    key={rowIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0',
                    }}
                  >
                    {/* Row number */}
                    <span
                      style={{
                        width: '24px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#9ca3af',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {rowIdx + 1}
                    </span>

                    {/* Seats in row */}
                    {row.map((seatId, seatIdx) => {
                      const isOccupied = occupiedSet.has(seatId);
                      const isSelected = selectedSeats.includes(seatId);
                      const isAisle = seatIdx === 1;

                      let bg = '#fff';
                      let color = '#374151';
                      let border = '2px solid #49c489';
                      let cursor = 'pointer';
                      let pattern = 'none';

                      if (isOccupied) {
                        bg = '#d1d5db';
                        color = '#9ca3af';
                        border = '2px solid #d1d5db';
                        cursor = 'not-allowed';
                        pattern =
                          'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 5px)';
                      } else if (isSelected) {
                        bg = '#49c489';
                        color = '#fff';
                        border = '2px solid #49c489';
                      }

                      return (
                        <div
                          key={seatId}
                          style={{
                            marginRight: isAisle ? '28px' : '4px',
                            marginLeft: seatIdx === 0 ? '0' : undefined,
                          }}
                        >
                          <button
                            type="button"
                            disabled={isOccupied}
                            onClick={() => toggleSeat(seatId)}
                            className="seat-btn"
                            style={{
                              width: '40px',
                              height: '45px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: bg,
                              color: color,
                              border: border,
                              cursor: cursor,
                              backgroundImage: pattern,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isSelected
                                ? '0 2px 8px rgba(73,196,137,0.4)'
                                : 'none',
                            }}
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
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 16px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0',
                  fontSize: '13px',
                  color: '#15803d',
                  fontWeight: 500,
                }}
              >
                {selectedSeats.length} seat
                {selectedSeats.length !== 1 ? 's' : ''} selected:{' '}
                {selectedSeats.join(', ')}
              </div>
            )}

            {/* Boarding & Dropping info */}
            {trip.route?.stops && trip.route.stops.length > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  gap: '32px',
                  fontSize: '13px',
                  color: '#6b7280',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>
                    Boarding:{' '}
                  </span>
                  {trip.route.origin_city}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>
                    Dropping:{' '}
                  </span>
                  {trip.route.destination_city}
                </div>
              </div>
            )}
          </div>

          {/* ---- PASSENGER DETAILS ---- */}
          {selectedSeats.length > 0 && (
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                padding: '24px',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#1a1a2e',
                  marginBottom: '20px',
                  fontFamily: 'Poppins',
                }}
              >
                Passenger Details
              </h2>

              {/* Contact details */}
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px',
                  }}
                >
                  Contact Details
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Phone
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                      }}
                    />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'Inter',
                      }}
                    />
                  </div>
                  <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Mail
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                      }}
                    />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'Inter',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Passenger forms */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedSeats.map((seat, i) => (
                  <div
                    key={seat}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      background: '#fafafa',
                    }}
                  >
                    {/* Passenger header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '14px',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#d84e55',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {i + 1}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                        Passenger {i + 1} &middot; Seat{' '}
                        <span style={{ color: '#d84e55' }}>{seat}</span>
                      </span>
                    </div>

                    {/* Fields row */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 1fr 1fr',
                        gap: '10px',
                        alignItems: 'start',
                      }}
                    >
                      {/* Name */}
                      <input
                        placeholder="Full name"
                        value={passengers[i]?.name || ''}
                        onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '13px',
                          outline: 'none',
                          fontFamily: 'Inter',
                        }}
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
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '13px',
                          outline: 'none',
                          fontFamily: 'Inter',
                        }}
                      />

                      {/* Gender pills */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                        }}
                      >
                        {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => {
                          const active = passengers[i]?.gender === g;
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => updatePassenger(i, 'gender', g)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 600,
                                border: active
                                  ? '2px solid #d84e55'
                                  : '1px solid #e5e7eb',
                                background: active ? '#fef2f2' : '#fff',
                                color: active ? '#d84e55' : '#6b7280',
                                cursor: 'pointer',
                                fontFamily: 'Inter',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {g === 'MALE' ? 'M' : g === 'FEMALE' ? 'F' : 'O'}
                            </button>
                          );
                        })}
                      </div>

                      {/* ID Type + Number */}
                      <div style={{ display: 'flex', gap: '6px' }}>
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
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '13px',
                            outline: 'none',
                            fontFamily: 'Inter',
                            minWidth: 0,
                          }}
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
        <div style={{ position: 'sticky', top: '24px' }}>
          {/* Trip Info Card */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            {/* Maroon header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #8b1a2b, #a52433)',
                padding: '16px 20px',
                color: '#fff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                }}
              >
                <Bus size={18} />
                <span style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'Poppins' }}>
                  {trip.bus?.bus_type || 'Standard'}
                </span>
              </div>
              <span style={{ fontSize: '12px', opacity: 0.85 }}>
                {trip.bus?.bus_number}
              </span>
              {trip.operator?.company_name && (
                <div
                  style={{
                    fontSize: '12px',
                    opacity: 0.85,
                    marginTop: '2px',
                  }}
                >
                  {trip.operator.company_name}
                </div>
              )}
            </div>

            {/* Route visual */}
            <div style={{ padding: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                {/* Timeline dots */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: '4px',
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      border: '3px solid #d84e55',
                      background: '#fff',
                    }}
                  />
                  <div
                    style={{
                      width: '2px',
                      height: '40px',
                      background:
                        'repeating-linear-gradient(to bottom, #d1d5db 0px, #d1d5db 4px, transparent 4px, transparent 8px)',
                    }}
                  />
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#49c489',
                    }}
                  />
                </div>

                {/* Cities + times */}
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '28px' }}>
                    <p
                      style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#1a1a2e',
                        fontFamily: 'Poppins',
                        margin: 0,
                      }}
                    >
                      {trip.departure_time?.substring(0, 5)}
                    </p>
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        margin: '2px 0 0',
                      }}
                    >
                      {trip.route?.origin_city}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#1a1a2e',
                        fontFamily: 'Poppins',
                        margin: 0,
                      }}
                    >
                      {trip.arrival_time?.substring(0, 5)}
                    </p>
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        margin: '2px 0 0',
                      }}
                    >
                      {trip.route?.destination_city}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date + duration */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f3f4f6',
                  fontSize: '13px',
                  color: '#6b7280',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> {trip.trip_date}
                </span>
                {trip.route?.estimated_duration && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> {trip.route.estimated_duration}
                  </span>
                )}
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '14px',
                    flexWrap: 'wrap',
                  }}
                >
                  {amenities.map((a) => {
                    const Icon = AMENITY_ICONS[a.toLowerCase()] || Star;
                    return (
                      <div
                        key={a}
                        title={a}
                        style={{
                          padding: '4px 10px',
                          background: '#f3f4f6',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: '#6b7280',
                          fontWeight: 500,
                        }}
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

          {/* Fare Summary Card */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              padding: '20px',
              marginTop: '16px',
            }}
          >
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#1a1a2e',
                marginBottom: '16px',
                fontFamily: 'Poppins',
              }}
            >
              Fare Summary
            </h3>

            {selectedSeats.length > 0 ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
                  <span>
                    Base fare ({selectedSeats.length} × NPR {fare})
                  </span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>
                    NPR {baseTotal}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
                  <span>GST (13%)</span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>
                    NPR {gst}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: '#6b7280',
                    marginBottom: '12px',
                  }}
                >
                  <span>Service fee ({selectedSeats.length} × NPR 50)</span>
                  <span style={{ fontWeight: 600, color: '#374151' }}>
                    NPR {serviceFee}
                  </span>
                </div>
                <div
                  style={{
                    borderTop: '2px solid #f3f4f6',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1a1a2e',
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      fontSize: '22px',
                      fontWeight: 800,
                      color: '#d84e55',
                      fontFamily: 'Poppins',
                    }}
                  >
                    NPR {totalAmount}
                  </span>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontSize: '13px',
                  color: '#9ca3af',
                  textAlign: 'center',
                  padding: '20px 0',
                }}
              >
                Select seats to see fare details
              </p>
            )}

            {/* Proceed button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit() || isSubmitting}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '14px',
                background: canSubmit() && !isSubmitting ? '#d84e55' : '#e5e7eb',
                color: canSubmit() && !isSubmitting ? '#fff' : '#9ca3af',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: canSubmit() && !isSubmitting ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'Poppins',
                transition: 'all 0.15s ease',
                boxShadow:
                  canSubmit() && !isSubmitting
                    ? '0 4px 12px rgba(216,78,85,0.3)'
                    : 'none',
              }}
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  <CreditCard size={18} />
                  {selectedSeats.length > 0
                    ? `Proceed to Pay · NPR ${totalAmount}`
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
