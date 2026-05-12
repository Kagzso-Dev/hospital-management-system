export function SkeletonLine({ w = 'w-full', h = 'h-4' }) {
  return <div className={`skeleton ${w} ${h}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine w="w-2/3" h="h-4" />
          <SkeletonLine w="w-1/3" h="h-3" />
        </div>
      </div>
      <SkeletonLine h="h-3" />
      <SkeletonLine w="w-4/5" h="h-3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
      <div className="skeleton w-14 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine w="w-1/3" h="h-4" />
        <SkeletonLine w="w-1/2" h="h-3" />
      </div>
      <div className="skeleton w-16 h-6 rounded-full" />
      <div className="skeleton w-16 h-8 rounded-lg" />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-2">
          <div className="skeleton h-8 w-10 mx-auto rounded" />
          <div className="skeleton h-3 w-16 mx-auto rounded" />
        </div>
      ))}
    </div>
  );
}
