"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallets } from "@privy-io/react-auth";
import { Check, ExternalLink, Tag, TriangleAlert } from "lucide-react";
import { HederaSessionGate } from "@/components/consumer/HederaSessionGate";
import { isMarketplaceApprovedClient } from "@/lib/consumer/chain/reads";
import { useCreateListing } from "@/lib/consumer/hooks/use-create-listing";
import type { CreateListingState } from "@/lib/consumer/hooks/use-create-listing";

const STATE_LABEL: Record<CreateListingState, string> = {
  IDLE: "Ready to list",
  VALIDATING: "Validating ownership…",
  AWAITING_APPROVAL_SIGNATURE: "Waiting for approval signature…",
  CONFIRMING_APPROVAL: "Confirming approval on Hedera…",
  AWAITING_SIGNATURE: "Waiting for wallet signature…",
  SUBMITTED: "Listing transaction submitted",
  CONFIRMING_ON_HEDERA: "Confirming on Hedera…",
  VERIFYING_LISTING: "Verifying listing on-chain…",
  CONFIRMED: "Listed for sale",
  SIGNATURE_REJECTED: "Signature rejected",
  TRANSACTION_REVERTED: "Transaction reverted",
  TRANSACTION_FAILED: "Listing failed",
  WRONG_NETWORK: "Wrong network",
};

const FAILURE_STATES = new Set<CreateListingState>([
  "SIGNATURE_REJECTED",
  "TRANSACTION_REVERTED",
  "TRANSACTION_FAILED",
  "WRONG_NETWORK",
]);

export function ResellPanel({
  productId,
  productCode,
  currentOwnerWallet,
}: {
  productId: string;
  productCode: string;
  currentOwnerWallet: string | null;
}) {
  const { wallets } = useWallets();
  const { state, txHash, error, createListing } = useCreateListing(productId);
  const [price, setPrice] = useState("");
  const [needsApproval, setNeedsApproval] = useState<boolean | null>(null);

  const wallet = wallets[0];

  useEffect(() => {
    if (!wallet) return;
    isMarketplaceApprovedClient(wallet.address as `0x${string}`)
      .then((approved) => setNeedsApproval(!approved))
      .catch(() => setNeedsApproval(true));
  }, [wallet]);

  const busy = !["IDLE", "CONFIRMED"].includes(state) && !FAILURE_STATES.has(state);
  const priceValid = Number(price) > 0;

  return (
    <div className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Real Hedera testnet resale
      </p>
      <h1 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{productCode}</h1>

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
                  Your connected wallet does not currently own this product on-chain.
                </p>
              </div>
            );
          }

          return (
            <div className="mt-6">
              <label className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                Price (HBAR)
              </label>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                disabled={busy}
                inputMode="decimal"
                placeholder="0"
                className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--vc-accent)]"
              />

              {needsApproval ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  First time listing: you&apos;ll sign one extra approval transaction so the
                  marketplace contract can transfer this token on your behalf.
                </p>
              ) : null}

              <button
                type="button"
                disabled={busy || !priceValid || needsApproval === null}
                onClick={() => void createListing(sessionWallet, Number(price), needsApproval === true)}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Tag size={16} />
                )}
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

          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

          {state === "CONFIRMED" ? (
            <Link
              href="/consumer/hedera-marketplace"
              className="mt-4 flex h-11 items-center justify-center rounded-full border border-[var(--border)] text-sm font-medium"
            >
              View marketplace
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
