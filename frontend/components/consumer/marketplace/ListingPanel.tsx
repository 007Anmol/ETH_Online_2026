"use client";

import { useEffect, useState } from "react";
import { Ban, Check, ExternalLink, ShoppingBag, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { HederaSessionGate } from "@/components/consumer/HederaSessionGate";
import { TransactionSteps } from "@/components/consumer/transaction/TransactionSteps";
import type { TransactionStepsStatus } from "@/components/consumer/transaction/TransactionSteps";
import { usePurchaseListing } from "@/lib/consumer/hooks/use-purchase-listing";
import type { PurchaseState } from "@/lib/consumer/hooks/use-purchase-listing";
import { useCancelListing } from "@/lib/consumer/hooks/use-cancel-listing";
import type { CancelListingState } from "@/lib/consumer/hooks/use-cancel-listing";
import { LoadingState } from "@/components/consumer/states/LoadingState";

type ListingInfo = {
  productStatus: string | null;
  listing: { status: string; seller: string; priceHbar: string };
};

const PURCHASE_FAILURE_STATES = new Set([
  "SIGNATURE_REJECTED",
  "TRANSACTION_REVERTED",
  "TRANSACTION_FAILED",
  "OWNERSHIP_VERIFICATION_FAILED",
  "WRONG_NETWORK",
]);
const CANCEL_FAILURE_STATES = new Set([
  "SIGNATURE_REJECTED",
  "TRANSACTION_REVERTED",
  "TRANSACTION_FAILED",
  "WRONG_NETWORK",
]);

const PURCHASE_STEPS = ["Validate listing", "Sign purchase", "Confirm on Hedera", "Verify ownership"];
const CANCEL_STEPS = ["Sign cancellation", "Confirm on Hedera"];

function purchaseProgress(
  state: PurchaseState,
): { activeIndex: number; status: TransactionStepsStatus } | null {
  switch (state) {
    case "VALIDATING_LISTING":
      return { activeIndex: 0, status: "progress" };
    case "AWAITING_SIGNATURE":
      return { activeIndex: 1, status: "progress" };
    case "SUBMITTED":
    case "CONFIRMING_ON_HEDERA":
      return { activeIndex: 2, status: "progress" };
    case "VERIFYING_OWNERSHIP":
      return { activeIndex: 3, status: "progress" };
    case "COMPLETED":
      return { activeIndex: 3, status: "done" };
    case "SIGNATURE_REJECTED":
    case "WRONG_NETWORK":
      return { activeIndex: 1, status: "failed" };
    case "TRANSACTION_REVERTED":
    case "TRANSACTION_FAILED":
      return { activeIndex: 2, status: "failed" };
    case "OWNERSHIP_VERIFICATION_FAILED":
      return { activeIndex: 3, status: "failed" };
    default:
      return null;
  }
}

function cancelProgress(
  state: CancelListingState,
): { activeIndex: number; status: TransactionStepsStatus } | null {
  switch (state) {
    case "AWAITING_SIGNATURE":
      return { activeIndex: 0, status: "progress" };
    case "SUBMITTED":
    case "CONFIRMING_ON_HEDERA":
      return { activeIndex: 1, status: "progress" };
    case "CANCELLED":
      return { activeIndex: 1, status: "done" };
    case "SIGNATURE_REJECTED":
    case "WRONG_NETWORK":
      return { activeIndex: 0, status: "failed" };
    case "TRANSACTION_REVERTED":
    case "TRANSACTION_FAILED":
      return { activeIndex: 1, status: "failed" };
    default:
      return null;
  }
}

export function ListingPanel({
  productId,
  productCode,
  productIdHash,
}: {
  productId: string;
  productCode: string;
  productIdHash: `0x${string}`;
}) {
  const [info, setInfo] = useState<ListingInfo | null>(null);
  const purchaseHook = usePurchaseListing(productId);
  const cancelHook = useCancelListing(productId, productIdHash);

  useEffect(() => {
    fetch(`/api/consumer/marketplace/listings/${productId}`)
      .then((res) => res.json())
      .then(setInfo);
  }, [productId, purchaseHook.state, cancelHook.state]);

  useEffect(() => {
    if (purchaseHook.error && PURCHASE_FAILURE_STATES.has(purchaseHook.state)) {
      toast.error(purchaseHook.error);
    }
  }, [purchaseHook.error, purchaseHook.state]);

  useEffect(() => {
    if (cancelHook.error && CANCEL_FAILURE_STATES.has(cancelHook.state)) {
      toast.error(cancelHook.error);
    }
  }, [cancelHook.error, cancelHook.state]);

  if (!info) {
    return (
      <div className="vc-neon-panel rounded-xl">
        <LoadingState label="Loading listing" />
      </div>
    );
  }

  const isActive = info.listing.status === "Active";

  return (
    <div className="vc-card vc-neon-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Real Hedera testnet listing
      </p>
      <h1 className="vc-neon-text mt-2 text-lg font-semibold">{productCode}</h1>

      <dl className="mt-4 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Status</dt>
          <dd>{info.listing.status}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Seller</dt>
          <dd className="font-mono text-xs">{info.listing.seller}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Price</dt>
          <dd>{info.listing.priceHbar} HBAR</dd>
        </div>
      </dl>

      {!isActive ? (
        <p className="mt-6 text-sm text-[var(--muted)]">This listing is no longer active.</p>
      ) : (
        <HederaSessionGate>
          {(sessionWallet) =>
            sessionWallet.address.toLowerCase() === info.listing.seller.toLowerCase() ? (
              <button
                type="button"
                disabled={cancelHook.state !== "IDLE" && cancelHook.state !== "CANCELLED"}
                onClick={() => void cancelHook.cancel(sessionWallet)}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] text-sm font-medium disabled:opacity-50"
              >
                <Ban size={16} />
                {cancelHook.state === "IDLE" ? "Cancel listing" : cancelHook.state}
              </button>
            ) : (
              <button
                type="button"
                disabled={purchaseHook.state !== "IDLE" && purchaseHook.state !== "COMPLETED"}
                onClick={() => void purchaseHook.purchase(sessionWallet)}
                className={`mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] text-sm font-medium text-white disabled:opacity-50 ${
                  purchaseHook.state !== "IDLE" && purchaseHook.state !== "COMPLETED" ? "vc-glow-pulse" : ""
                }`}
              >
                <ShoppingBag size={16} />
                {purchaseHook.state === "IDLE" ? `Buy for ${info.listing.priceHbar} HBAR` : purchaseHook.state}
              </button>
            )
          }
        </HederaSessionGate>
      )}

      {purchaseHook.state !== "IDLE" ? (
        <div className="mt-5 border-t border-[var(--border)] pt-4 text-sm">
          {purchaseProgress(purchaseHook.state) ? (
            <TransactionSteps steps={PURCHASE_STEPS} {...purchaseProgress(purchaseHook.state)!} />
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            {purchaseHook.state === "COMPLETED" ? (
              <Check size={16} className="text-emerald-600" />
            ) : PURCHASE_FAILURE_STATES.has(purchaseHook.state) ? (
              <TriangleAlert size={16} className="text-red-500" />
            ) : (
              <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--vc-accent)]" />
            )}
            <span className="font-medium">{purchaseHook.state}</span>
          </div>
          {purchaseHook.txHash ? (
            <a
              href={`https://hashscan.io/testnet/transaction/${purchaseHook.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-1.5 font-mono text-xs text-[var(--vc-accent)] hover:underline"
            >
              {purchaseHook.txHash}
              <ExternalLink size={12} />
            </a>
          ) : null}
          {purchaseHook.error ? <p className="mt-2 text-xs text-red-600">{purchaseHook.error}</p> : null}
        </div>
      ) : null}

      {cancelHook.state !== "IDLE" ? (
        <div className="mt-5 border-t border-[var(--border)] pt-4 text-sm">
          {cancelProgress(cancelHook.state) ? (
            <TransactionSteps steps={CANCEL_STEPS} {...cancelProgress(cancelHook.state)!} />
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            {cancelHook.state === "CANCELLED" ? (
              <Check size={16} className="text-emerald-600" />
            ) : CANCEL_FAILURE_STATES.has(cancelHook.state) ? (
              <TriangleAlert size={16} className="text-red-500" />
            ) : (
              <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--vc-accent)]" />
            )}
            <span className="font-medium">{cancelHook.state}</span>
          </div>
          {cancelHook.error ? <p className="mt-2 text-xs text-red-600">{cancelHook.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
