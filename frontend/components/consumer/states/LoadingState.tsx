export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)] motion-reduce:animate-none" />
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
