import type { VerificationOutcome } from "@/lib/consumer/types";

const PRESENTATION: Record<
  VerificationOutcome,
  { label: string; dotClassName: string; badgeClassName: string }
> = {
  VERIFIED: {
    label: "Verified",
    dotClassName: "bg-[var(--vc-success)]",
    badgeClassName:
      "border-[var(--vc-success)]/30 bg-[var(--vc-success-soft)] text-[var(--vc-success)]",
  },
  INCOMPLETE: {
    label: "Incomplete record",
    dotClassName: "bg-[var(--vc-warning)]",
    badgeClassName:
      "border-[var(--vc-warning)]/30 bg-[var(--vc-warning-soft)] text-[var(--vc-warning)]",
  },
  SUSPICIOUS: {
    label: "Suspicious",
    dotClassName: "bg-[var(--vc-danger)]",
    badgeClassName:
      "border-[var(--vc-danger)]/30 bg-[var(--vc-danger-soft)] text-[var(--vc-danger)]",
  },
  NOT_FOUND: {
    label: "Not found",
    dotClassName: "bg-[var(--muted)]",
    badgeClassName: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]",
  },
};

export function VerificationBadge({ outcome }: { outcome: VerificationOutcome }) {
  const { label, dotClassName, badgeClassName } = PRESENTATION[outcome];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClassName}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />
      {label}
    </span>
  );
}
