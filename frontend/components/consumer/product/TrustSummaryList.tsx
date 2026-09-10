import { Check, X, Clock } from "lucide-react";
import type { VerificationStep, VerificationStepId } from "@/lib/consumer/types";

const DESCRIPTIONS: Record<VerificationStepId, string> = {
  PRODUCT_IDENTITY: "Verified against registered product data",
  MANUFACTURER: "Registered manufacturer record found",
  SUPPLY_CHAIN: "Expected checkpoints available",
  BLOCKCHAIN_PROOF: "On-chain proof available",
};

function StatusIcon({ status }: { status: VerificationStep["status"] }) {
  if (status === "passed") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--vc-success-soft)] text-[var(--vc-success)]">
        <Check size={13} strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--vc-danger-soft)] text-[var(--vc-danger)]">
        <X size={13} strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
      <Clock size={13} strokeWidth={2} />
    </span>
  );
}

export function TrustSummaryList({ steps }: { steps: VerificationStep[] }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm font-medium text-[var(--foreground)]">Why this record can be trusted</p>

      <ul className="mt-4 space-y-4">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-3">
            <StatusIcon status={step.status} />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">{step.label.replace("Checking ", "")}</p>
              <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
                {DESCRIPTIONS[step.id]}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
