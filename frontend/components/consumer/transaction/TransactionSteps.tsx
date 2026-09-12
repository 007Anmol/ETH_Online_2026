import { ProgressDot, type ProgressDotState } from "@/components/consumer/ProgressDot";

export type TransactionStepsStatus = "progress" | "done" | "failed";

/**
 * The same step-progress language as ClaimProgress (which itself reuses
 * ProgressDot from the verify/journey/proof flow) — applied to real
 * on-chain transaction flows (transfer, list, buy, cancel, withdraw) so a
 * multi-second wallet-signature-then-confirmation sequence reads as a
 * continuous animated journey instead of a single generic spinner.
 */
export function TransactionSteps({
  steps,
  activeIndex,
  status,
}: {
  steps: string[];
  activeIndex: number;
  status: TransactionStepsStatus;
}) {
  function stateFor(index: number): ProgressDotState {
    if (status === "done") return "completed";
    if (status === "failed") {
      if (index < activeIndex) return "completed";
      if (index === activeIndex) return "anomaly";
      return "future";
    }
    if (index < activeIndex) return "completed";
    if (index === activeIndex) return "current";
    return "future";
  }

  return (
    <ol className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {steps.map((label, index) => {
        const state = stateFor(index);
        return (
          <li key={label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <ProgressDot state={state} size="sm" />
              {index < steps.length - 1 ? (
                <span
                  className="mt-1 mb-1 w-px flex-1"
                  style={{
                    background: state === "completed" ? "var(--vc-accent)" : "var(--border)",
                  }}
                />
              ) : null}
            </div>
            <p
              className={`pb-5 text-sm ${
                state === "future" ? "text-[var(--muted)]" : "text-[var(--foreground)]"
              }`}
            >
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
