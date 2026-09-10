import { ProgressDot, type ProgressDotState } from "@/components/consumer/ProgressDot";
import { RevealGroup } from "@/components/consumer/RevealGroup";
import type { BlockchainProofState } from "@/lib/consumer/types";

const NODES = ["Product", "Verification record", "Blockchain transaction", "Public proof"];

/**
 * The product and its verification record always exist by the time this
 * page renders (we already have `proof`), so only the last two nodes vary
 * with the actual on-chain state — never hardcoded to "confirmed".
 */
function statesFor(proofState: BlockchainProofState): ProgressDotState[] {
  if (proofState === "CONFIRMED") return ["completed", "completed", "completed", "completed"];
  if (proofState === "PENDING") return ["completed", "completed", "current", "future"];
  return ["completed", "completed", "missing", "missing"];
}

export function ProofFlowDiagram({ state }: { state: BlockchainProofState }) {
  const dotStates = statesFor(state);

  return (
    <div className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">How this works</p>

      <RevealGroup className="mt-4 flex items-center justify-between">
        {NODES.map((label, index) => (
          <div key={label} data-reveal className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative flex h-9 w-9 items-center justify-center">
                <ProgressDot state={dotStates[index]} />
              </div>
              <span className="max-w-[4.5rem] text-[10px] leading-tight text-[var(--muted)]">
                {label}
              </span>
            </div>
            {index < NODES.length - 1 ? (
              <span
                className="mx-1 h-px flex-1 transition-colors duration-500"
                style={{
                  background:
                    dotStates[index] === "completed" ? "var(--vc-accent)" : "var(--border)",
                }}
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </RevealGroup>
    </div>
  );
}
