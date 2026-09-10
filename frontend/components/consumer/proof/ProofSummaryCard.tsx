import type { ReactNode } from "react";
import { HashScanLink } from "@/components/ui/hashscan-link";
import { formatOrNotAvailable, formatRelativeTime } from "@/lib/consumer/format";
import type { BlockchainProof } from "@/lib/consumer/types";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] py-3 last:border-b-0">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="text-sm font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

export function ProofSummaryCard({ proof }: { proof: BlockchainProof }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Proof status</p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
        {proof.state}
      </p>

      <div className="mt-4">
        <Row label="Network" value={formatOrNotAvailable(proof.network)} />
        <Row label="Block" value={formatOrNotAvailable(proof.blockNumber)} />
        <Row
          label="Transaction"
          value={
            proof.transactionHash ? (
              <HashScanLink txHash={proof.transactionHash} />
            ) : (
              "Not available"
            )
          }
        />
        <Row label="Confirmed" value={formatRelativeTime(proof.timestamp)} />
      </div>
    </div>
  );
}
