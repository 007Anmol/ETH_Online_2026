"use client";

import { useEffect, useState } from "react";
import { useConnectWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { Ban, Check, ExternalLink, ShoppingBag, TriangleAlert, Wallet } from "lucide-react";
import { usePurchaseListing } from "@/lib/consumer/hooks/use-purchase-listing";
import { useCancelListing } from "@/lib/consumer/hooks/use-cancel-listing";
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

export function ListingPanel({
  productId,
  productCode,
  productIdHash,
}: {
  productId: string;
  productCode: string;
  productIdHash: `0x${string}`;
}) {
  const { ready, authenticated } = usePrivy();
  const { connectWallet } = useConnectWallet();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const [info, setInfo] = useState<ListingInfo | null>(null);
  const purchaseHook = usePurchaseListing(productId);
  const cancelHook = useCancelListing(productId, productIdHash);

  useEffect(() => {
    fetch(`/api/consumer/marketplace/listings/${productId}`)
      .then((res) => res.json())
      .then(setInfo);
  }, [productId, purchaseHook.state, cancelHook.state]);

  if (!info) return <LoadingState label="Loading listing" />;

  const isSeller = !!wallet && wallet.address.toLowerCase() === info.listing.seller.toLowerCase();
  const isActive = info.listing.status === "Active";

  return (
    <div className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Real Hedera testnet listing
      </p>
      <h1 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{productCode}</h1>

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
      ) : !ready ? null : !authenticated || !wallet ? (
        <button
          type="button"
          onClick={() => connectWallet()}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] text-sm font-medium text-white"
        >
          <Wallet size={16} />
          Connect wallet
        </button>
      ) : isSeller ? (
        <button
          type="button"
          disabled={cancelHook.state !== "IDLE" && cancelHook.state !== "CANCELLED"}
          onClick={() => void cancelHook.cancel(wallet)}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] text-sm font-medium disabled:opacity-50"
        >
          <Ban size={16} />
          {cancelHook.state === "IDLE" ? "Cancel listing" : cancelHook.state}
        </button>
      ) : (
        <button
          type="button"
          disabled={purchaseHook.state !== "IDLE" && purchaseHook.state !== "COMPLETED"}
          onClick={() => void purchaseHook.purchase(wallet)}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] text-sm font-medium text-white disabled:opacity-50"
        >
          <ShoppingBag size={16} />
          {purchaseHook.state === "IDLE" ? `Buy for ${info.listing.priceHbar} HBAR` : purchaseHook.state}
        </button>
      )}

      {purchaseHook.state !== "IDLE" ? (
        <div className="mt-5 border-t border-[var(--border)] pt-4 text-sm">
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
