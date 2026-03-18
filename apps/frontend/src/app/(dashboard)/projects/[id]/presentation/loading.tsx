export default function PresentationLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
      <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
