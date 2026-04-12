export function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Title */}
      <div className="h-6 w-40 rounded-lg bg-gray-200" />
      <div className="h-3 w-20 rounded bg-gray-200" />

      {/* Main stat block */}
      <div className="rounded-xl bg-gray-200 h-20" />

      {/* Stat rows */}
      <div className="space-y-3 pt-1">
        <div className="flex justify-between">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      </div>

      {/* Bar */}
      <div className="h-3 w-full rounded-full bg-gray-200" />
    </div>
  );
}
