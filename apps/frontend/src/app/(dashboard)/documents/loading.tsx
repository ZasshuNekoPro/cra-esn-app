export default function DocumentsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-44 bg-gray-200 rounded animate-pulse" />
      <div className="h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
