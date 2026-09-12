import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

type WarningStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function WarningState({ title, description, action }: WarningStateProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/20 text-amber-600">
        <AlertTriangle size={16} strokeWidth={1.5} />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
        <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
        {action}
      </div>
    </div>
  );
}
