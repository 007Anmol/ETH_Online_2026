"use client";

import { AlertCircle } from "lucide-react";

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-[var(--vc-danger)]/30 bg-[var(--vc-danger-soft)] p-10 text-center"
    >
      <AlertCircle size={22} strokeWidth={1.5} className="text-[var(--vc-danger)]" />
      <h3 className="text-sm font-medium text-[var(--foreground)]">{title}</h3>
      {description ? (
        <p className="max-w-xs text-sm leading-6 text-[var(--muted)]">
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
