function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[var(--surface-muted)] motion-reduce:animate-none ${className}`}
    />
  );
}

export default function JourneyLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <Skeleton className="h-4 w-24 rounded-full" />
      <div className="mt-10 flex justify-center">
        <div className="w-full max-w-lg space-y-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full max-w-xs" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
