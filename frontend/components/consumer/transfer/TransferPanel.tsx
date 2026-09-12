"use client";

import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { Check, ExternalLink, TriangleAlert } from "lucide-react";
import { HederaSessionGate } from "@/components/consumer/HederaSessionGate";
import { useNftTransfer } from "@/lib/consumer/hooks/use-nft-transfer";
import type { TransferState } from "@/lib/consumer/types";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const STATE_LABEL: Record<TransferState, string> = {
  IDLE: "Ready to transfer",
  VALIDATING: "Validating ownership…",
  AWAITING_SIGNATURE: "Waiting for wallet signature…",
  SUBMITTED: "Transaction submitted",
  CONFIRMING_ON_HEDERA: "Confirming on Hedera…",
  VERIFYING_OWNERSHIP: "Verifying new owner on-chain…",
  CONFIRMED: "Ownership transferred",
  SIGNATURE_REJECTED: "Signature rejected",
  TRANSACTION_REVERTED: "Transaction reverted",
  TRANSACTION_FAILED: "Transfer failed",
  OWNERSHIP_VERIFICATION_FAILED: "Could not verify new owner",
  WRONG_NETWORK: "Wrong network",
};

const FAILURE_STATES = new Set<TransferState>([
  "SIGNATURE_REJECTED",
  "TRANSACTION_REVERTED",
  "TRANSACTION_FAILED",
  "OWNERSHIP_VERIFICATION_FAILED",
  "WRONG_NETWORK",
]);

export function TransferPanel({
  productId,
  productCode,
  productIdHash,
  currentOwnerWallet,
}: {
  productId: string;
  productCode: string;
  productIdHash: `0x${string}`;
  currentOwnerWallet: string | null;
}) {
  const { wallets } = useWallets();
  const { state, txHash, error, syncStatus, transfer } = useNftTransfer(productId);
  const [recipient, setRecipient] = useState("");

  const wallet = wallets[0];
  const busy = !["IDLE", "CONFIRMED"].includes(state) && !FAILURE_STATES.has(state);
  const recipientValid = ADDRESS_PATTERN.test(recipient.trim());

  return (
    <div className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Real Hedera testnet transfer
      </p>
      <h1 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{productCode}</h1>
      <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">{productIdHash}</p>

      <dl className="mt-4 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Current owner</dt>
          <dd className="font-mono text-xs">{currentOwnerWallet ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Your wallet</dt>
          <dd className="font-mono text-xs">{wallet?.address ?? "not connected"}</dd>
        </div>
      </dl>

      <HederaSessionGate>
        {(sessionWallet) => {
          const isOwner =
            !!currentOwnerWallet &&
            sessionWallet.address.toLowerCase() === currentOwnerWallet.toLowerCase();

          if (!isOwner) {
            return (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-[var(--muted)]">
                  Your connected wallet does not currently own this product on-chain, so it
                  cannot transfer it.
                </p>
              </div>
            );
          }

          return (
            <div className="mt-6">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                Recipient wallet address
              </label>
              <input
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                disabled={busy}
                placeholder="0x..."
                spellCheck={false}
                className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-mono text-sm outline-none focus:border-[var(--vc-accent)]"
              />

              <button
                type="button"
                disabled={busy || !recipientValid}
                onClick={() => void transfer(sessionWallet, recipient.trim())}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : null}
                {STATE_LABEL[state]}
              </button>
            </div>
          );
        }}
      </HederaSessionGate>

      {state !== "IDLE" ? (
        <div className="mt-5 border-t border-[var(--border)] pt-4 text-sm">
          <div className="flex items-center gap-2">
            {state === "CONFIRMED" ? (
              <Check size={16} className="text-emerald-600" />
            ) : FAILURE_STATES.has(state) ? (
              <TriangleAlert size={16} className="text-red-500" />
            ) : (
              <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--vc-accent)]" />
            )}
            <span className="font-medium text-[var(--foreground)]">{STATE_LABEL[state]}</span>
          </div>

          {txHash ? (
            <a
              href={`https://hashscan.io/testnet/transaction/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-1.5 font-mono text-xs text-[var(--vc-accent)] hover:underline"
            >
              {txHash}
              <ExternalLink size={12} />
            </a>
          ) : null}

          {state === "CONFIRMED" && syncStatus === "SYNC_FAILED" ? (
            <p className="mt-2 text-xs text-amber-600">
              Confirmed on Hedera — account history is still syncing.
            </p>
          ) : null}

          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
