import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { reviewAPI, bookingAPI } from '../../api';
import type { Booking } from '../../types';
import toast from 'react-hot-toast';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

interface Review {
  id: number;
  rating: number;
  title: string;
  comment: string;
  is_anonymous: boolean;
  created_at: string;
  user: { id: number; full_name: string };
  trip?: {
    id: number;
    trip_date: string;
    departure_time: string;
    route?: {
      id?: number;
      origin_city?: string;
      destination_city?: string;
      origin?: { name: string };
      destination?: { name: string };
    };
  };
}

function StarRating({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          className={`text-2xl ${interactive ? 'cursor-pointer' : 'cursor-default'} ${
            star <= (hover || rating) ? 'text-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          disabled={!interactive}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tripId, setTripId] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'my'>('write');
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);

  const loadMyReviews = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      const res = await reviewAPI.getMyReviews({ page: 1, limit: 100 });
      setReviews(res.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated } = useAutoRefresh(loadMyReviews, 30000, true, false);

  useEffect(() => {
    loadMyReviews(true);
    bookingAPI
      .getAll({ page: 1, limit: 100 })
      .then((res) => setCompletedBookings(res.data.data.bookings || []))
      .catch(() => {});
  }, [loadMyReviews]);

  const reviewedTripIds = new Set(reviews.map((r) => r.trip?.id).filter(Boolean));
  const eligibleTrips = (() => {
    const seen = new Set<number>();
    const list: { id: number; label: string }[] = [];
    completedBookings.forEach((b) => {
      if (b.booking_status !== 'COMPLETED' || !b.trip_id) return;
      if (seen.has(b.trip_id) || reviewedTripIds.has(b.trip_id)) return;
      seen.add(b.trip_id);
      const r = b.trip?.route;
      const label = r
        ? `${r.origin_city} → ${r.destination_city} • ${b.trip?.trip_date || ''}`
        : `Trip #${b.trip_id}`;
      list.push({ id: b.trip_id, label });
    });
    return list;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId) {
      toast.error('Please select a trip');
      return;
    }
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      await reviewAPI.create({
        trip_id: parseInt(tripId),
        rating,
        title,
        comment,
        is_anonymous: isAnonymous,
      });
      toast.success('Review submitted successfully!');
      setRating(0);
      setTitle('');
      setComment('');
      setIsAnonymous(false);
      setTripId('');
      loadMyReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await reviewAPI.delete(id);
      toast.success('Review deleted');
      loadMyReviews();
    } catch {
      toast.error('Failed to delete review');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reviews & Ratings</h1>
        {lastUpdated && (
          <div className="flex items-center gap-1.5">
            <RefreshCw className={`h-3 w-3 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-[10px] text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          className={`pb-2 px-4 font-medium ${activeTab === 'write' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('write')}
        >
          Write a Review
        </button>
        <button
          className={`pb-2 px-4 font-medium ${activeTab === 'my' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('my')}
        >
          My Reviews
        </button>
      </div>

      {activeTab === 'write' && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip</label>
            {eligibleTrips.length > 0 ? (
              <select
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select a completed trip</option>
                {eligibleTrips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 border rounded-lg px-3 py-2">
                Complete a trip (with a confirmed booking) to review it here.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating *</label>
            <StarRating rating={rating} onRate={setRating} interactive />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Summarize your experience"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={4}
              placeholder="Tell others about your experience..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="anonymous" className="text-sm text-gray-600">Post anonymously</label>
          </div>

          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}

      {activeTab === 'my' && (
        <div>
          {loading ? (
            <p className="text-gray-500">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-gray-500">You haven't written any reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white shadow rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <StarRating rating={review.rating} />
                      {review.title && <h3 className="font-medium mt-1">{review.title}</h3>}
                      {review.trip && (
                        <p className="text-sm text-gray-500">
                          {review.trip.route?.origin_city || review.trip.route?.origin?.name} →{' '}
                          {review.trip.route?.destination_city || review.trip.route?.destination?.name}
                          {review.trip.trip_date ? ` | ${new Date(review.trip.trip_date).toLocaleDateString()}` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                  {review.comment && <p className="text-gray-700 mt-2">{review.comment}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
