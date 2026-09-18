import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingAPI, paymentAPI } from '../../api';
import type { Booking } from '../../types';
import { CreditCard, Wallet, CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
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
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const response = await bookingAPI.getById(parseInt(bookingId!));
      setBooking(response.data.data.booking);
    } catch (error: any) {
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
        // Redirect to payment gateway
        window.location.href = payment_url;
        return;
      }

      // For wallet payment, verify immediately
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Booking not found</h2>
        <Link to="/my-bookings" className="mt-4 text-blue-600 hover:underline">
          Go to My Bookings
        </Link>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your booking has been confirmed. Your PNR is:
          </p>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-3xl font-mono font-bold text-blue-600 tracking-wider">
              {booking.pnr}
            </p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Please save this PNR for future reference. You will also receive a confirmation via SMS and email.
          </p>
          <div className="flex gap-3">
            <Link
              to="/my-bookings"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View My Bookings
            </Link>
            <Link
              to="/"
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Book Another Trip
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <Link to="/my-bookings" className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Bookings
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Complete Payment</h1>

        {/* Booking Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Booking Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">PNR</span>
              <span className="font-mono font-semibold">{booking.pnr}</span>
            </div>
            {booking.trip && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Route</span>
                  <span className="font-medium">
                    {booking.trip.route.origin_city} → {booking.trip.route.destination_city}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">{booking.trip.trip_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Departure</span>
                  <span className="font-medium">{booking.trip.departure_time}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Passengers</span>
              <span className="font-medium">{booking.total_passengers}</span>
            </div>
            <hr className="my-3" />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total Amount</span>
              <span className="font-bold text-blue-600">NPR {booking.total_amount}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Payment Method</h2>
          <div className="space-y-3">
            {[
              { id: 'ESEWA', name: 'eSewa', icon: Wallet, color: 'text-green-600' },
              { id: 'KHALTI', name: 'Khalti', icon: Wallet, color: 'text-purple-600' },
              { id: 'WALLET', name: 'Samaya Wallet', icon: CreditCard, color: 'text-blue-600' },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`w-full flex items-center p-4 border-2 rounded-lg transition ${
                  paymentMethod === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <method.icon className={`w-6 h-6 ${method.color} mr-3`} />
                <span className="font-medium">{method.name}</span>
                {paymentMethod === method.id && (
                  <CheckCircle className="w-5 h-5 text-blue-600 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={paying}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center"
        >
          {paying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            `Pay NPR ${booking.total_amount}`
          )}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Your booking will be confirmed after successful payment.
        </p>
      </div>
    </div>
  );
}
