export default function CraMonthLoading() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 w-28 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
