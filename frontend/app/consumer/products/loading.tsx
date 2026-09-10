function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[var(--surface-muted)] motion-reduce:animate-none ${className}`}
    />
  );
}

export default function ProductsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
      <Skeleton className="h-4 w-28 rounded-full" />
      <Skeleton className="mt-3 h-8 w-48" />

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
