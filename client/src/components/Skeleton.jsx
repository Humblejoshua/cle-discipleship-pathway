export function Skeleton({ className = '', width, height }) {
  return (
    <div
      className={`skeleton rounded ${className}`}
      style={{ width, height }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
      <Skeleton height="20px" width="60%" />
      <Skeleton height="14px" width="40%" />
      <Skeleton height="8px" width="100%" />
    </div>
  );
}

export function ClassListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton width="10px" height="10px" className="rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton height="14px" width="70%" />
              <Skeleton height="12px" width="30%" />
            </div>
          </div>
          <Skeleton width="60px" height="28px" className="rounded-lg" />
        </div>
      ))}
    </div>
  );
}
