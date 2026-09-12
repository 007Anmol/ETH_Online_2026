import { AlertTriangle } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description: string;
  onRetry?: () => void;
};

export function ErrorState({ title = "Something went wrong", description, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 text-red-600">
        <AlertTriangle size={20} strokeWidth={1.5} />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
        <p className="max-w-xs text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center rounded-full border border-[var(--border)] px-5 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
