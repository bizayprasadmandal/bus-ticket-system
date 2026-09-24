import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingAPI, paymentAPI } from '../../api';
import type { Booking } from '../../types';
import { CreditCard, CheckCircle, XCircle, ArrowLeft, Bus, Ticket, Shield, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getBookAnotherPath, getMyBookingsPath } from '../../utils/homePath';

const PAYMENT_TABS = [
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Credit/Debit Card' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'netbanking', label: 'Net Banking' },
] as const;

const WALLET_OPTIONS = [
  { id: 'ESEWA', name: 'eSewa', icon: 'eS', desc: 'Pay instantly with eSewa', color: '#10b981' },
  { id: 'KHALTI', name: 'Khalti', icon: 'Kh', desc: 'Pay instantly with Khalti', color: '#6d28d9' },
  { id: 'WALLET', name: 'Gadi Wallet', icon: 'GW', desc: 'Pay from your Gadi Ticket balance', color: '#d84e55' },
] as const;

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const myBookingsPath = getMyBookingsPath(user);
  const bookAnotherPath = getBookAnotherPath(user);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('wallet');
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
      navigate(myBookingsPath);
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
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="relative">
          <div className="w-14 h-14 border-4 border-gray-200 rounded-full" />
          <div className="w-14 h-14 border-4 border-transparent rounded-full animate-spin absolute top-0 left-0" style={{ borderTopColor: '#d84e55', borderRightColor: '#d84e55' }} />
        </div>
        <p className="mt-5 text-gray-500 font-medium text-sm">Loading booking details...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Booking Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">The booking you are looking for does not exist or has been removed.</p>
          <Link to={myBookingsPath} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-colors" style={{ backgroundColor: '#d84e55' }}>
            <ArrowLeft className="w-4 h-4" />
            Go to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="relative mx-auto mb-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-bounce" style={{ backgroundColor: '#e8f5e9' }}>
              <CheckCircle className="w-14 h-14" style={{ color: '#4caf50' }} />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-lg text-white" style={{ backgroundColor: '#d84e55' }}>&#10003;</div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-sm text-white" style={{ backgroundColor: '#ff9800' }}>&#10003;</div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-500 text-sm mb-6">Your booking has been confirmed. Get ready for your journey!</p>
          <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: '#fef3f3', border: '2px solid #d84e55' }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your PNR Number</p>
            <p className="text-3xl font-mono font-bold tracking-widest" style={{ color: '#d84e55' }}>{booking.pnr}</p>
          </div>
          <p className="text-xs text-gray-400 mb-8 leading-relaxed">
            Save this PNR for future reference. You will also receive SMS and email confirmation.
          </p>
          <div className="flex gap-3">
            <Link to={myBookingsPath} className="flex-1 py-3 rounded-xl font-semibold text-white text-center transition-colors" style={{ backgroundColor: '#d84e55' }}>
              View My Bookings
            </Link>
            <Link to={bookAnotherPath} className="flex-1 py-3 rounded-xl font-semibold text-center transition-colors border-2 border-gray-200 text-gray-700 hover:bg-gray-50">
              Book Another
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to={myBookingsPath} className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Complete Payment</h1>
            <p className="text-sm text-gray-500">Choose your preferred payment method</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {PAYMENT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 py-4 text-sm font-semibold text-center transition-colors relative"
                    style={{ color: activeTab === tab.id ? '#d84e55' : '#6b7280' }}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full" style={{ backgroundColor: '#d84e55' }} />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'upi' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border-2 p-5 transition-all" style={{ borderColor: '#d84e55', backgroundColor: '#fef3f3' }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm">
                          <CreditCard className="w-6 h-6" style={{ color: '#d84e55' }} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">UPI Payment</p>
                          <p className="text-sm text-gray-500">Pay using any UPI app (Google Pay, PhonePe, etc.)</p>
                        </div>
                        <div className="ml-auto">
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: '#d84e55' }}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d84e55' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 text-center">You will be redirected to your UPI app to complete payment</p>
                  </div>
                )}

                {activeTab === 'card' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border-2 p-5 transition-all" style={{ borderColor: '#d84e55', backgroundColor: '#fef3f3' }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm">
                          <CreditCard className="w-6 h-6" style={{ color: '#d84e55' }} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Credit / Debit Card</p>
                          <p className="text-sm text-gray-500">Visa, Mastercard, Rupay accepted</p>
                        </div>
                        <div className="ml-auto">
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: '#d84e55' }}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d84e55' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 text-center">You will be redirected to a secure payment gateway</p>
                  </div>
                )}

                {activeTab === 'wallet' && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-600 mb-4">Select your wallet</p>
                    {WALLET_OPTIONS.map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => setPaymentMethod(wallet.id)}
                        className="w-full rounded-xl border-2 p-4 transition-all text-left"
                        style={{
                          borderColor: paymentMethod === wallet.id ? '#d84e55' : '#e5e7eb',
                          backgroundColor: paymentMethod === wallet.id ? '#fef3f3' : 'white',
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: wallet.color }}>
                            {wallet.icon}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-800">{wallet.name}</p>
                            <p className="text-sm text-gray-500">{wallet.desc}</p>
                          </div>
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: paymentMethod === wallet.id ? '#d84e55' : '#d1d5db' }}>
                            {paymentMethod === wallet.id && (
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d84e55' }} />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'netbanking' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border-2 p-5 transition-all" style={{ borderColor: '#d84e55', backgroundColor: '#fef3f3' }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm">
                          <Shield className="w-6 h-6" style={{ color: '#d84e55' }} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Net Banking</p>
                          <p className="text-sm text-gray-500">Pay directly from your bank account</p>
                        </div>
                        <div className="ml-auto">
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: '#d84e55' }}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d84e55' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 text-center">You will be redirected to your bank's net banking page</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 mb-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-400">Secured by 256-bit SSL encryption</p>
            </div>
          </div>

          <div className="w-full lg:w-[380px] order-1 lg:order-2">
            <div className="lg:sticky lg:top-6">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4" style={{ backgroundColor: '#d84e55' }}>
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-white" />
                    <h2 className="text-white font-bold text-base">Booking Summary</h2>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">PNR Number</p>
                    <p className="text-lg font-mono font-bold text-gray-800 tracking-wider">{booking.pnr}</p>
                  </div>

                  {booking.trip && (
                    <div className="mb-5 pb-5 border-b border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3f3' }}>
                          <Bus className="w-4 h-4" style={{ color: '#d84e55' }} />
                        </div>
                        <p className="font-bold text-gray-800 text-sm">
                          {booking.trip.route.origin_city}
                          <span className="mx-2" style={{ color: '#d84e55' }}>&rarr;</span>
                          {booking.trip.route.destination_city}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 ml-11">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {booking.trip.trip_date}
                        </span>
                        <span className="font-semibold text-gray-700">
                          {booking.trip.departure_time?.substring(0, 5)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mb-5 pb-5 border-b border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Passengers ({booking.total_passengers})</p>
                    {booking.passengers && booking.passengers.length > 0 ? (
                      <div className="space-y-2">
                        {booking.passengers.map((p, i) => (
                          <div key={p.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#d84e55' }}>
                                {i + 1}
                              </div>
                              <span className="font-medium text-gray-700">{p.passenger_name}</span>
                            </div>
                            <span className="text-gray-500 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{p.seat_number}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">{booking.total_passengers} passenger(s)</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Price Details</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Base fare x {booking.total_passengers}</span>
                      <span className="font-medium text-gray-700">NPR {booking.base_amount}</span>
                    </div>
                    {booking.tax_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">GST (13%)</span>
                        <span className="font-medium text-gray-700">NPR {booking.tax_amount}</span>
                      </div>
                    )}
                    {booking.service_fee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Service fee</span>
                        <span className="font-medium text-gray-700">NPR {booking.service_fee}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-gray-800">Total</span>
                        <span className="text-xl font-bold" style={{ color: '#d84e55' }}>NPR {booking.total_amount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={paying}
                className="w-full mt-4 py-4 rounded-xl font-bold text-white text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#d84e55',
                  boxShadow: '0 4px 14px rgba(216, 78, 85, 0.4)',
                }}
              >
                {paying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay NPR ${booking.total_amount}`
                )}
              </button>

              <p className="text-center text-xs text-gray-400 mt-3">
                Your booking will be confirmed after successful payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}