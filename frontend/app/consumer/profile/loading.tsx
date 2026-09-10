function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[var(--surface-muted)] motion-reduce:animate-none ${className}`}
    />
  );
}

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-20" />
        <Skeleton className="h-28" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
