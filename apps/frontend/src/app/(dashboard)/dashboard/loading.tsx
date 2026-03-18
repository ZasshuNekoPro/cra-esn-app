export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
    </div>
  );
}
