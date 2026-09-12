export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]" />
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
