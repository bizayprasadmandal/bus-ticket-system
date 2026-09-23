import { useState, useCallback } from 'react';
import { Star, MessageSquare, RefreshCw, Loader2, Filter } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import toast from 'react-hot-toast';

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
    route?: { origin_city: string; destination_city: string };
  };
}

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

export default function OperatorReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [, setOperatorId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const userRes = await api.get('/auth/verify');
      const user = userRes.data.data;
      const opId = user.operator_id || user.id;
      setOperatorId(opId);

      const res = await api.get(`/reviews/operator/${opId}`);
      setReviews(res.data.data || []);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(fetchData, 30000);

  const filteredReviews = ratingFilter !== null
    ? reviews.filter((r) => r.rating === ratingFilter)
    : reviews;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage: reviews.length > 0
      ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
      : 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-[#d84e55]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">See what customers are saying about your service</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Rating Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left - Average Rating */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-gray-800">{avgRating}</div>
            <StarRating rating={Math.round(parseFloat(avgRating))} />
            <p className="text-sm text-gray-500 mt-2">{reviews.length} total reviews</p>
          </div>

          {/* Right - Rating Breakdown */}
          <div className="space-y-2">
            {ratingCounts.map((rc) => (
              <div key={rc.star} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-8">{rc.star}★</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${rc.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8 text-right">{rc.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setRatingFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              ratingFilter === null
                ? 'bg-[#d84e55] text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setRatingFilter(star)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                ratingFilter === star
                  ? 'bg-[#d84e55] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {star}★ ({reviews.filter((r) => r.rating === star).length})
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No reviews found</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#d84e55]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[#d84e55] font-medium text-sm">
                      {review.is_anonymous
                        ? 'A'
                        : review.user?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">
                        {review.is_anonymous ? 'Anonymous' : review.user?.full_name || 'Customer'}
                      </span>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                    {review.title && (
                      <h3 className="text-sm font-semibold text-gray-800 mt-1">{review.title}</h3>
                    )}
                    {review.trip && (
                      <p className="text-xs text-gray-500 mt-1">
                        {review.trip.route?.origin_city} → {review.trip.route?.destination_city} |{' '}
                        {new Date(review.trip.trip_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-gray-600 mt-3 ml-13">{review.comment}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
