import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingAPI, paymentAPI } from '../../api';
import type { Booking } from '../../types';
import { CreditCard, Wallet, CheckCircle, XCircle, ArrowLeft, Loader2, Bus, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('ESEWA');
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    if (bookingId) loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const response = await bookingAPI.getById(parseInt(bookingId!));
      setBooking(response.data.data.booking);
    } catch {
      toast.error('Failed to load booking details');
      navigate('/my-bookings');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!booking) return;
    setPaying(true);
    try {
      const response = await paymentAPI.initiate({
        booking_id: booking.id,
        payment_method: paymentMethod,
        amount: booking.total_amount,
      });
      const { payment_id, payment_url } = response.data.data;
      if (payment_url) {
        window.location.href = payment_url;
        return;
      }
      if (paymentMethod === 'WALLET') {
        const verifyResponse = await paymentAPI.verify(payment_id);
        if (verifyResponse.data.success) {
          setPaymentComplete(true);
          toast.success('Payment successful!');
        } else {
          toast.error('Payment failed. Please try again.');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading booking...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center py-16">
        <XCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Booking not found</h2>
        <Link to="/my-bookings" className="mt-4 text-primary-600 hover:text-primary-700 font-medium">Go to My Bookings</Link>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Payment Successful!</h1>
          <p className="text-gray-500 mb-6">Your booking has been confirmed.</p>
          <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-5 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your PNR</p>
            <p className="text-3xl font-mono font-bold text-primary-600 tracking-wider">{booking.pnr}</p>
          </div>
          <p className="text-sm text-gray-400 mb-6">Save this PNR for future reference. You will also receive SMS & email confirmation.</p>
          <div className="flex gap-3">
            <Link to="/my-bookings" className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all text-center">
              View Bookings
            </Link>
            <Link to="/" className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all text-center">
              Book Another
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/my-bookings" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to My Bookings
      </Link>

      <h1 className="text-2xl font-bold text-gray-800 mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Complete Payment</h1>

      {/* Booking Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Ticket className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-800">Booking Summary</h2>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Bus className="h-4 w-4 text-primary-500" />
            <span className="font-bold text-gray-800">{booking.pnr}</span>
          </div>
          {booking.trip && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">{booking.trip.route.origin_city} → {booking.trip.route.destination_city}</span>
              <span>|</span>
              <span>{booking.trip.trip_date}</span>
              <span>|</span>
              <span>{booking.trip.departure_time?.substring(0, 5)}</span>
            </div>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Passengers</span>
            <span className="font-medium">{booking.total_passengers}</span>
          </div>
          {booking.base_amount && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Base fare</span>
                <span className="font-medium">NPR {booking.base_amount} × {booking.total_passengers}</span>
              </div>
              {booking.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax (13%)</span>
                  <span className="font-medium">NPR {booking.tax_amount}</span>
                </div>
              )}
              {booking.service_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Service fee</span>
                  <span className="font-medium">NPR {booking.service_fee}</span>
                </div>
              )}
            </>
          )}
          <hr className="border-gray-100" />
          <div className="flex justify-between text-lg">
            <span className="font-bold text-gray-800">Total Amount</span>
            <span className="font-bold text-primary-600">NPR {booking.total_amount}</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Select Payment Method</h2>
        <div className="space-y-3">
          {[
            { id: 'ESEWA', name: 'eSewa', color: 'bg-green-50 border-green-200 text-green-700', iconBg: 'bg-green-100' },
            { id: 'KHALTI', name: 'Khalti', color: 'bg-purple-50 border-purple-200 text-purple-700', iconBg: 'bg-purple-100' },
            { id: 'WALLET', name: 'Samaya Wallet', color: 'bg-primary-50 border-primary-200 text-primary-700', iconBg: 'bg-primary-100' },
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => setPaymentMethod(method.id)}
              className={`w-full flex items-center p-4 border-2 rounded-xl transition-all ${
                paymentMethod === method.id
                  ? `${method.color} shadow-sm`
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method.iconBg}`}>
                {method.id === 'WALLET' ? <Wallet className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
              </div>
              <span className="ml-3 font-semibold">{method.name}</span>
              {paymentMethod === method.id && (
                <CheckCircle className="w-5 h-5 ml-auto text-green-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={paying}
        className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/25 hover:shadow-xl active:scale-[0.99] flex items-center justify-center gap-2"
      >
        {paying ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay NPR ${booking.total_amount}`
        )}
      </button>

      <p className="text-center text-sm text-gray-400 mt-4">
        Your booking will be confirmed after successful payment.
      </p>
    </div>
  );
}
