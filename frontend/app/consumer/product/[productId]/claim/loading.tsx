function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[var(--surface-muted)] motion-reduce:animate-none ${className}`}
    />
  );
}

export default function ClaimLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <Skeleton className="h-4 w-16 rounded-full" />

      <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
