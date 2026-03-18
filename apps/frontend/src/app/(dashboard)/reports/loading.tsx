export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-52 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
