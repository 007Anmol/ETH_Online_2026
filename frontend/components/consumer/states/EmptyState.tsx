import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
      <Icon size={22} strokeWidth={1.5} className="text-[var(--muted)]" />
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
