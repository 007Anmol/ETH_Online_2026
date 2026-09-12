import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)]">
        <Icon size={20} strokeWidth={1.5} />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
        <p className="max-w-xs text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>

      {action}
    </div>
  );
}
