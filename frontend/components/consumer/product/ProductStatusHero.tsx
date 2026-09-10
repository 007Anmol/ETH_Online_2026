import { Check, HelpCircle, AlertTriangle, SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { VerificationOutcome } from "@/lib/consumer/types";

const PRESENTATION: Record<
  VerificationOutcome,
  { icon: LucideIcon; heading: string; iconClassName: string; description: string }
> = {
  VERIFIED: {
    icon: Check,
    heading: "VERIFIED",
    iconClassName: "bg-[var(--vc-success-soft)] text-[var(--vc-success)]",
    description: "This product's trusted records are consistent.",
  },
  INCOMPLETE: {
    icon: HelpCircle,
    heading: "INCOMPLETE",
    iconClassName: "bg-[var(--vc-warning-soft)] text-[var(--vc-warning)]",
    description: "This product exists, but some verification information is unavailable.",
  },
  SUSPICIOUS: {
    icon: AlertTriangle,
    heading: "SUSPICIOUS",
    iconClassName: "bg-[var(--vc-danger-soft)] text-[var(--vc-danger)]",
    description: "Trusted records for this product contain inconsistencies that require attention.",
  },
  NOT_FOUND: {
    icon: SearchX,
    heading: "NOT FOUND",
    iconClassName: "bg-[var(--surface-muted)] text-[var(--muted)]",
    description: "No trusted product record was found.",
  },
};

export function ProductStatusHero({ outcome }: { outcome: VerificationOutcome }) {
  const { icon: Icon, heading, iconClassName, description } = PRESENTATION[outcome];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <div>
        <p className="text-sm font-semibold tracking-[-0.01em] text-[var(--foreground)]">
          {heading}
        </p>
        <p className="mt-0.5 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}
