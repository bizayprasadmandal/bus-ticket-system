import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

interface CancelBookingModalProps {
  bookingId: number;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

export default function CancelBookingModal({ bookingId, isOpen, onClose, onCancelled }: CancelBookingModalProps) {
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isOpen) return null;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await api.post(`/bookings/${bookingId}/cancel`, { reason });
      toast.success('Booking cancelled successfully');
      onCancelled();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-[#d84e55]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Cancel Booking</h3>
              <p className="text-xs text-gray-400">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Refund Policy */}
        <div className="px-5 py-4 bg-amber-50 border-b border-amber-100">
          <p className="text-xs font-bold text-amber-800 mb-2">Refund Policy:</p>
          <div className="space-y-1 text-xs text-amber-700">
            <p>24+ hours before departure: <span className="font-bold">80% refund</span></p>
            <p>&lt;24 hours before departure: <span className="font-bold">50% refund</span></p>
            <p>After departure: <span className="font-bold">No refund</span></p>
          </div>
        </div>

        {/* Reason */}
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for cancellation..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d84e55]/30 focus:border-[#d84e55] resize-none"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Keep Booking
          </button>
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="flex-1 px-4 py-2.5 bg-[#d84e55] text-white rounded-lg text-sm font-bold hover:bg-[#c4434b] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCancelling ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
