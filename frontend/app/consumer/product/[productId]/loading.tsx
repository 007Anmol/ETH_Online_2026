function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[var(--surface-muted)] motion-reduce:animate-none ${className}`}
    />
  );
}

export default function ProductLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
      <Skeleton className="h-4 w-40 rounded-full" />

      <div className="mt-6 flex flex-col gap-6">
        <Skeleton className="h-20" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col items-center gap-5 lg:items-start">
            <Skeleton className="aspect-square w-full max-w-xs" />
            <Skeleton className="h-8 w-48" />
          </div>

          <div className="flex flex-col gap-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
