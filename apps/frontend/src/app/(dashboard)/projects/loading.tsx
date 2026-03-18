export default function ProjectsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
