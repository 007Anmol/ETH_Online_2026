function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[var(--surface-muted)] motion-reduce:animate-none ${className}`}
    />
  );
}

export default function ProofLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <Skeleton className="h-4 w-16 rounded-full" />

      <div className="mx-auto mt-8 flex w-full max-w-xl flex-col items-center gap-6">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-5 w-40" />

        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>

        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
