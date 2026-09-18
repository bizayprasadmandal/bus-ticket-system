interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function TripCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="w-32 h-4 mb-2" />
            <Skeleton className="w-20 h-3" />
          </div>
        </div>
        <Skeleton className="w-16 h-8" />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-20 h-6" />
        <Skeleton className="flex-1 h-1" />
        <Skeleton className="w-20 h-6" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-32 h-10" />
      </div>
    </div>
  );
}

export function BookingCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-32 h-5" />
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton className="w-48 h-4" />
        <Skeleton className="w-36 h-4" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-20 h-4" />
      </div>
    </div>
  );
}

export function SeatLayoutSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-2">
          <Skeleton className="w-8 h-4" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((seat) => (
              <Skeleton key={seat} className="w-10 h-10 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-4">
          <Skeleton className="w-24 h-4 mb-2" />
          <Skeleton className="w-16 h-8" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <Skeleton className="w-48 h-6" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="flex-1 h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
