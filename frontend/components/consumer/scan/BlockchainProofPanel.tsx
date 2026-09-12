import { ShieldCheck, ShieldQuestion, ShieldAlert } from "lucide-react";
import { HashScanLink } from "@/components/ui/hashscan-link";
import type { BlockchainProof } from "@/lib/consumer/types";

const STATUS_META: Record<
  BlockchainProof["status"],
  { icon: typeof ShieldCheck; label: string; className: string }
> = {
  confirmed: {
    icon: ShieldCheck,
    label: "Confirmed on-chain",
    className: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600",
  },
  pending: {
    icon: ShieldQuestion,
    label: "Pending confirmation",
    className: "border-amber-500/20 bg-amber-500/[0.06] text-amber-600",
  },
  unavailable: {
    icon: ShieldAlert,
    label: "No proof available",
    className: "border-red-500/20 bg-red-500/[0.06] text-red-600",
  },
};

function truncateAddress(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function BlockchainProofPanel({ proof }: { proof: BlockchainProof }) {
  const meta = STATUS_META[proof.status];
  const Icon = meta.icon;

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-6">
      <h3 className="text-sm font-medium">Blockchain proof</h3>
      <div
        className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta.className}`}
      >
        <Icon size={13} />
        {meta.label}
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Network</dt>
          <dd className="font-medium">
            {proof.network} · {proof.layer}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Contract</dt>
          <dd className="font-mono text-xs">
            {proof.contractAddress ? truncateAddress(proof.contractAddress) : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Transaction</dt>
          <dd>
            {proof.transactionHash ? (
              <HashScanLink txHash={proof.transactionHash} />
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Block</dt>
          <dd className="font-mono text-xs">
            {proof.blockNumber ? `#${proof.blockNumber.toLocaleString()}` : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Event</dt>
          <dd className="font-medium">{proof.verificationEvent}</dd>
        </div>
      </dl>
    </div>
  );
}
