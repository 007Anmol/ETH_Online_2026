import { Check, HelpCircle, AlertTriangle, SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ConsumerProduct, VerificationOutcome, VerificationRun } from "@/lib/consumer/types";

const PRESENTATION: Record<
  VerificationOutcome,
  {
    icon: LucideIcon;
    heading: string;
    iconClassName: string;
    description: string;
  }
> = {
  VERIFIED: {
    icon: Check,
    heading: "VERIFIED",
    iconClassName: "bg-[var(--vc-success-soft)] text-[var(--vc-success)]",
    description: "This product's identity and history are confirmed on-chain.",
  },
  INCOMPLETE: {
    icon: HelpCircle,
    heading: "INCOMPLETE",
    iconClassName: "bg-[var(--vc-warning-soft)] text-[var(--vc-warning)]",
    description:
      "This product's record exists, but some verification information is currently unavailable.",
  },
  SUSPICIOUS: {
    icon: AlertTriangle,
    heading: "SUSPICIOUS",
    iconClassName: "bg-[var(--vc-danger-soft)] text-[var(--vc-danger)]",
    description: "The trusted record for this product contains inconsistencies.",
  },
  NOT_FOUND: {
    icon: SearchX,
    heading: "NOT FOUND",
    iconClassName: "bg-[var(--surface-muted)] text-[var(--muted)]",
    description: "No trusted product record was found for this ID.",
  },
};

type VerificationOutcomeCardProps = {
  run: VerificationRun;
  product: ConsumerProduct | null;
  onScanAnother: () => void;
};

export function VerificationOutcomeCard({ run, product, onScanAnother }: VerificationOutcomeCardProps) {
  const { icon: Icon, heading, iconClassName, description } = PRESENTATION[run.outcome];

  return (
    <div className="vc-card w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${iconClassName}`}>
        <Icon size={26} strokeWidth={2} />
      </div>

      <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
        {heading}
      </h2>

      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>

      <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-6 text-[var(--muted)]">
        {run.summary}
      </p>

      {product ? (
        <p className="mt-3 font-mono text-xs text-[var(--muted)]">{product.productId}</p>
      ) : run.outcome !== "NOT_FOUND" ? (
        <p className="mt-3 font-mono text-xs text-[var(--muted)]">{run.productId}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {run.outcome === "VERIFIED" || run.outcome === "INCOMPLETE" ? (
          <Button href={`/consumer/product/${encodeURIComponent(run.productId)}`}>
            {run.outcome === "VERIFIED" ? "View product details" : "View available details"}
          </Button>
        ) : null}

        <button
          type="button"
          onClick={onScanAnother}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-6 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
        >
          {run.outcome === "NOT_FOUND" ? "Try another ID" : "Scan another product"}
        </button>
      </div>
    </div>
  );
}
