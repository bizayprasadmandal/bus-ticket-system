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
      loadPaymentDetails();
      return;
    }

    if (queryStatus === 'failed' || queryError) {
      loadPaymentDetails();
      return;
    }

    // For Khalti: pidx is passed as query param, verify via POST
    const pidx = searchParams.get('pidx');
    if (pidx) {
      verifyKhaltiPayment(pidx);
      return;
    }

    // For eSewa ePay v2: signed base64 data param, verify via POST
    const esewaData = searchParams.get('data');
    if (esewaData) {
      verifyEsewaV2Payment(esewaData);
      return;
    }

    // For eSewa v1: amt, rid, pid are passed as query params
    const amt = searchParams.get('amt');
    const rid = searchParams.get('rid');
    const pid = searchParams.get('pid');
    if (amt && rid && pid) {
      verifyEsewaPayment(amt, rid, pid);
      return;
    }

    // No gateway params - check the payment's real status
    loadPaymentDetails();
  }, [paymentId, searchParams]);

  const loadPaymentDetails = async () => {
    try {
      const response = await paymentAPI.getDetails(Number(paymentId));
      const payment = response.data.data.payment;
      setPaymentDetails(payment);
      const isSuccess = payment.status === 'SUCCESS';
      setStatus(isSuccess ? 'success' : 'failed');
      if (payment.status === 'SUCCESS') {
        toast.success(payment.payment_type === 'TOPUP' ? 'Wallet top-up confirmed!' : 'Payment confirmed!');
      }
    } catch {
      setStatus('error');
    }
  };

  const verifyKhaltiPayment = async (pidx: string) => {
    try {
      const response = await paymentAPI.verify(Number(paymentId), { pidx });
      if (response.data.success) {
        toast.success('Payment confirmed!');
      } else {
        toast.error('Payment verification failed');
      }
      await loadPaymentDetails();
    } catch {
      setStatus('error');
      toast.error('Payment verification failed');
    }
  };

  const verifyEsewaV2Payment = async (data: string) => {
    try {
      const response = await paymentAPI.verify(Number(paymentId), { data });
      if (response.data.success) {
        toast.success('Payment confirmed!');
      } else {
        toast.error('Payment verification failed');
      }
      await loadPaymentDetails();
    } catch {
      setStatus('error');
      toast.error('Payment verification failed');
    }
  };

  const verifyEsewaPayment = async (amt: string, rid: string, pid: string) => {
    try {
      const response = await paymentAPI.verify(Number(paymentId), { amt, rid, pid });
      if (response.data.success) {
        toast.success('Payment confirmed!');
      } else {
        toast.error('Payment verification failed');
      }
      await loadPaymentDetails();
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
    const isTopup = paymentDetails?.payment_type === 'TOPUP';
    return (
      <div className="flex flex-col items-center py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {isTopup ? 'Top-up Successful!' : 'Payment Successful!'}
          </h1>
          <p className="text-gray-500 mb-6">
            {isTopup
              ? `NPR ${Number(paymentDetails?.amount || 0).toLocaleString()} has been added to your wallet.`
              : 'Your booking has been confirmed.'}
          </p>
          {!isTopup && paymentDetails?.booking && (
            <div className="bg-primary-50 border-2 border-primary-200 rounded-2xl p-5 mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your PNR</p>
              <p className="text-3xl font-mono font-bold text-primary-600 tracking-wider">{paymentDetails.booking.pnr}</p>
            </div>
          )}
          {!isTopup && (
            <p className="text-sm text-gray-400 mb-6">Save this PNR for future reference. You will also receive SMS & email confirmation.</p>
          )}
          <div className="flex gap-3">
            <Link to={isTopup ? '/wallet' : myBookingsPath} className="btn-primary flex-1">
              {isTopup ? 'View Wallet' : 'View Bookings'}
            </Link>
            <Link to={isTopup ? '/' : bookAnotherPath} className="btn-outline flex-1">
              {isTopup ? 'Home' : 'Book Another'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Failed or error
  const isTopupFail = paymentDetails?.payment_type === 'TOPUP';
  return (
    <div className="flex flex-col items-center py-16">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {isTopupFail ? 'Top-up Failed' : 'Payment Failed'}
        </h1>
        <p className="text-gray-500 mb-6">
          {status === 'error' ? 'Something went wrong while verifying your payment.' : 'Your payment could not be processed.'}
        </p>
        <p className="text-sm text-gray-400 mb-6">
          {status === 'error'
            ? 'If an amount was deducted, it will be reflected after verification. Please check your bookings or contact support.'
            : 'No money has been deducted. Please try again.'}
        </p>
        <div className="flex gap-3">
          <Link to={isTopupFail ? '/wallet' : myBookingsPath} className="btn-primary flex-1">
            {isTopupFail ? 'Back to Wallet' : 'View Bookings'}
          </Link>
          <Link to={isTopupFail ? '/wallet' : bookAnotherPath} className="btn-outline flex-1">
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}
