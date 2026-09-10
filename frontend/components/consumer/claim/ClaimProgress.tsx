import { ProgressDot, type ProgressDotState } from "@/components/consumer/ProgressDot";
import type { ClaimStage } from "@/lib/consumer/hooks/use-claim-product";

const STEPS = ["Verify identity", "Create ownership record", "Confirm ownership"];

function statesFor(stage: ClaimStage): ProgressDotState[] {
  if (stage === "success") return ["completed", "completed", "completed"];
  if (stage === "processing") return ["completed", "current", "future"];
  if (stage === "failure") return ["completed", "anomaly", "future"];
  return ["completed", "future", "future"];
}

export function ClaimProgress({ stage }: { stage: ClaimStage }) {
  const states = statesFor(stage);

  return (
    <ol className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {STEPS.map((label, index) => (
        <li key={label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <ProgressDot state={states[index]} size="sm" />
            {index < STEPS.length - 1 ? (
              <span
                className="mt-1 mb-1 w-px flex-1"
                style={{
                  background:
                    states[index] === "completed"
                      ? "var(--vc-accent)"
                      : "var(--border)",
                }}
              />
            ) : null}
          </div>
          <p
            className={`pb-5 text-sm ${
              states[index] === "future" ? "text-[var(--muted)]" : "text-[var(--foreground)]"
            }`}
          >
            {label}
          </p>
        </li>
      ))}
    </ol>
  );
}
