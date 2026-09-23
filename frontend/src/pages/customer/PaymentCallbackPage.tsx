import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { paymentAPI } from '../../api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getBookAnotherPath, getMyBookingsPath } from '../../utils/homePath';

export default function PaymentCallbackPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const myBookingsPath = getMyBookingsPath(user);
  const bookAnotherPath = getBookAnotherPath(user);
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    if (!paymentId) return;

    const queryStatus = searchParams.get('status');
    const queryError = searchParams.get('error');

    // If gateway already verified via the GET callback endpoint, just fetch payment details
    if (queryStatus === 'success' || queryStatus === 'already_processed') {
      loadPaymentDetails('success');
      return;
    }

    if (queryStatus === 'failed' || queryError) {
      loadPaymentDetails('failed');
      return;
    }

    // For Khalti: pidx is passed as query param, verify via POST
    const pidx = searchParams.get('pidx');
    if (pidx) {
      verifyKhaltiPayment(pidx);
      return;
    }

    // For eSewa: amt, rid, pid are passed as query params
    const amt = searchParams.get('amt');
    const rid = searchParams.get('rid');
    const pid = searchParams.get('pid');
    if (amt && rid && pid) {
      verifyEsewaPayment(amt, rid, pid);
      return;
    }

    // No gateway params - check if payment was already verified
    loadPaymentDetails('unknown');
  }, [paymentId, searchParams]);

  const loadPaymentDetails = async (resultStatus: string) => {
    try {
      const response = await paymentAPI.getDetails(Number(paymentId));
      const payment = response.data.data.payment;
      setPaymentDetails(payment);
      setStatus(payment.status === 'SUCCESS' || resultStatus === 'success' ? 'success' : 'failed');
      if (payment.status === 'SUCCESS') {
        toast.success('Payment confirmed!');
      }
    } catch {
      setStatus(resultStatus === 'success' ? 'success' : 'error');
    }
  };

  const verifyKhaltiPayment = async (pidx: string) => {
    try {
      const response = await paymentAPI.verify(Number(paymentId), { pidx });
      if (response.data.success) {
        setStatus('success');
        toast.success('Payment confirmed!');
        loadPaymentDetails('success');
      } else {
        setStatus('failed');
        toast.error('Payment verification failed');
      }
    } catch {
      setStatus('error');
      toast.error('Payment verification failed');
    }
  };

  const verifyEsewaPayment = async (amt: string, rid: string, pid: string) => {
    try {
      const response = await paymentAPI.verify(Number(paymentId), { amt, rid, pid });
      if (response.data.success) {
        setStatus('success');
        toast.success('Payment confirmed!');
        loadPaymentDetails('success');
      } else {
        setStatus('failed');
        toast.error('Payment verification failed');
      }
    } catch {
      setStatus('error');
      toast.error('Payment verification failed');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Processing Payment...</h2>
        <p className="text-gray-500 text-sm">Please wait while we verify your payment</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Payment Successful!</h1>
          <p className="text-gray-500 mb-6">Your booking has been confirmed.</p>
          {paymentDetails?.booking && (
            <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-5 mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your PNR</p>
              <p className="text-3xl font-mono font-bold text-primary-600 tracking-wider">{paymentDetails.booking.pnr}</p>
            </div>
          )}
          <p className="text-sm text-gray-400 mb-6">Save this PNR for future reference. You will also receive SMS & email confirmation.</p>
          <div className="flex gap-3">
            <Link to={myBookingsPath} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all text-center">
              View Bookings
            </Link>
            <Link to={bookAnotherPath} className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all text-center">
              Book Another
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Failed or error
  return (
    <div className="flex flex-col items-center py-16">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Payment Failed</h1>
        <p className="text-gray-500 mb-6">
          {status === 'error' ? 'Something went wrong while verifying your payment.' : 'Your payment could not be processed.'}
        </p>
        <p className="text-sm text-gray-400 mb-6">No money has been deducted. Please try again.</p>
        <div className="flex gap-3">
          <Link to={myBookingsPath} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all text-center">
            View Bookings
          </Link>
          <Link to={bookAnotherPath} className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all text-center">
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}
