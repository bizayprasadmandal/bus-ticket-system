import { useState, useEffect, useCallback } from 'react';
import { Star, Search, RefreshCw, MessageSquare } from 'lucide-react';
import api from '../../api';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { TableSkeleton } from '../../components/Skeleton';
import ServerPagination from '../../components/ServerPagination';
import toast from 'react-hot-toast';

interface ReviewItem {
  id: number;
  user?: { full_name?: string };
  trip?: { route?: { origin_city?: string; destination_city?: string } };
  rating: number;
  title?: string;
  comment?: string;
  created_at: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingStats, setRatingStats] = useState({ five_star: 0, low_star: 0 });

  const itemsPerPage = 20;

  const loadReviews = useCallback(async () => {
    try {
      const params: any = { page: currentPage, limit: itemsPerPage };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (ratingFilter !== 'ALL') params.rating = ratingFilter;
      const res = await api.get('/admin/reviews', { params });
      const data = res.data.data || {};
      setReviews(data.items || []);
      setTotalPages(data.pagination?.total_pages || 1);
      setTotalItems(data.pagination?.total_items || (data.items || []).length);
      setAverageRating(Number(data.average_rating) || 0);
      setRatingStats(data.rating_stats || { five_star: 0, low_star: 0 });
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, ratingFilter, currentPage]);

  const { isRefreshing, lastUpdated, refresh } = useAutoRefresh(loadReviews, 30000, true, false);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600 font-medium">{rating}</span>
      </div>
    );
  };

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">All customer reviews for moderation</p>
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
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Average Rating</p>
          <p className="text-2xl font-bold text-amber-500">{averageRating.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">5 Star Reviews</p>
          <p className="text-2xl font-bold text-green-600">{ratingStats.five_star}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">1-2 Star Reviews</p>
          <p className="text-2xl font-bold text-[#d84e55]">{ratingStats.low_star}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, route, or comment..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none transition-all"
            />
          </div>
          <select
            value={ratingFilter}
            onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#d84e55] focus:border-[#d84e55] outline-none bg-white"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trip Route</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Rating</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Comment</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{review.user?.full_name || 'Unknown'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {review.trip?.route
                      ? `${review.trip.route.origin_city} → ${review.trip.route.destination_city}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">{renderStars(review.rating)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{review.title || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600 max-w-xs truncate" title={review.comment}>
                      {review.comment || '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No reviews found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ServerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
