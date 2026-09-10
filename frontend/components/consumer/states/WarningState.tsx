import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function WarningState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--vc-warning)]/30 bg-[var(--vc-warning-soft)] p-10 text-center">
      <AlertTriangle size={22} strokeWidth={1.5} className="text-[var(--vc-warning)]" />
      <h3 className="text-sm font-medium text-[var(--foreground)]">{title}</h3>
      {description ? (
        <p className="max-w-xs text-sm leading-6 text-[var(--muted)]">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
