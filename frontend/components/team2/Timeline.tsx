"use client";

type TimelineItem = {
  title: string;
  description: string;
  time: string;
  completed: boolean;
};

type Props = {
  items: TimelineItem[];
};

export default function Timeline({ items }: Props) {
  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div key={item.title} className="relative flex gap-4">
          {index !== items.length - 1 && (
            <div className="absolute left-[7px] top-5 h-full w-px bg-[var(--border)]" />
          )}

          <div
            className={`relative z-10 mt-1 h-4 w-4 rounded-full border-2 ${
              item.completed
                ? "border-[var(--foreground)] bg-[var(--foreground)]"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          />

          <div className="pb-7">
            <p className="text-xs font-semibold">{item.title}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{item.description}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wide text-[var(--muted)]">
              {item.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}