export default function ConsentLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      {[1, 2].map((i) => (
        <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
