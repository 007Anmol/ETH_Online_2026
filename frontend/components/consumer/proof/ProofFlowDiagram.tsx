import { Package, FileCheck, Link2, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS: { icon: LucideIcon; label: string }[] = [
  { icon: Package, label: "Product" },
  { icon: FileCheck, label: "Verification record" },
  { icon: Link2, label: "Blockchain transaction" },
  { icon: Globe, label: "Public proof" },
];

export function ProofFlowDiagram() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">How this works</p>

      <div className="mt-4 flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--foreground)]">
                <step.icon size={16} strokeWidth={1.5} />
              </span>
              <span className="max-w-[4.5rem] text-[10px] leading-tight text-[var(--muted)]">
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <span className="mx-1 h-px flex-1 bg-[var(--border)]" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
