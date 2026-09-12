"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Loader2,
  ShoppingBag,
  Tag,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { productCategoryLabel } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { LISTING_STATUS_PRESENTATION } from "@/lib/consumer/status";
import { marketplaceProvider } from "@/lib/consumer/registry";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import type { MarketplaceListing } from "@/lib/consumer/types";

type Stage = "idle" | "review" | "processing" | "success" | "failed";

export function ListingDetail({ listingId }: { listingId: string }) {
  const shouldReduceMotion = useReducedMotion();
  const [listing, setListing] = useState<MarketplaceListing | null | undefined>(undefined);
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    let cancelled = false;
    void marketplaceProvider.getListing(listingId).then((result) => {
      if (!cancelled) setListing(result);
    });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  async function completePurchase() {
    setStage("processing");
    try {
      await marketplaceProvider.buyListing(listingId);
      setStage("success");
    } catch {
      setStage("failed");
    }
  }

  if (listing === undefined) {
    return <LoadingState label="Loading listing" />;
  }

  if (listing === null) {
    return (
      <ErrorState
        title="Listing not found"
        description="This listing may have been sold, cancelled, or never existed."
      />
    );
  }

  const presentation = LISTING_STATUS_PRESENTATION[listing.status];
  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: { duration: 0.25 },
      };

  return (
    <div className="mt-8 max-w-xl">
      <div className="border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)]">
            <Tag size={20} />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${presentation.badgeClassName}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${presentation.dotClassName}`} />
            {presentation.label}
          </span>
        </div>

        <p className="mt-4 text-lg font-medium">{listing.name}</p>
        <p className="mt-1 font-mono text-xs text-[var(--muted)]">{listing.productCode}</p>

        <dl className="mt-5 space-y-2.5 border-t border-[var(--border)] pt-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Category</dt>
            <dd className="text-right font-medium">
              {productCategoryLabel(listing.category)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Seller</dt>
            <dd className="text-right font-medium">{listing.sellerDisplayName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Price</dt>
            <dd className="gradient-text text-right text-lg font-semibold">
              {formatUsd(listing.priceUsd)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 border border-[var(--border)] bg-[var(--surface)] p-6">
        <AnimatePresence mode="wait">
          {listing.status !== "active" ? (
            <motion.div key="unavailable" {...motionProps} className="flex flex-col items-center gap-3 py-6 text-center">
              <XCircle size={28} className="text-[var(--muted)]" />
              <p className="text-sm font-medium">This listing is no longer available</p>
              <Link
                href="/consumer/marketplace"
                className="mt-2 flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
              >
                Back to marketplace
              </Link>
            </motion.div>
          ) : listing.mine ? (
            <motion.div key="mine" {...motionProps} className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm font-medium">This is your listing</p>
              <p className="max-w-xs text-sm text-[var(--muted)]">
                Manage or cancel it from your listings.
              </p>
              <Link
                href="/consumer/marketplace?tab=mine"
                className="btn-accent mt-2 flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
              >
                View my listings
              </Link>
            </motion.div>
          ) : stage === "idle" ? (
            <motion.div key="idle" {...motionProps}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStage("review")}
                className="btn-accent flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-medium"
              >
                <ShoppingBag size={16} />
                Buy for {formatUsd(listing.priceUsd)}
              </motion.button>
            </motion.div>
          ) : stage === "review" ? (
            <motion.div key="review" {...motionProps}>
              <p className="text-sm font-medium">Confirm purchase</p>
              <div className="mt-4 flex items-start gap-3 border border-amber-500/20 bg-amber-500/[0.04] p-4">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-5 text-[var(--muted)]">
                  Payment and NFT settlement are simulated in this preview —
                  no real charge or on-chain transfer occurs yet.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage("idle")}
                  className="flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void completePurchase()}
                  className="btn-accent flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  Confirm purchase
                </button>
              </div>
            </motion.div>
          ) : stage === "processing" ? (
            <motion.div key="processing" {...motionProps} className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 size={28} className="animate-spin text-[var(--muted)]" />
              <p className="text-sm font-medium">Processing purchase…</p>
            </motion.div>
          ) : stage === "success" ? (
            <motion.div key="success" {...motionProps} className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
                <Check size={24} className="text-white" strokeWidth={3} />
              </span>
              <div>
                <p className="text-sm font-medium">Purchase complete</p>
                <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                  {listing.name} now appears in your collection.
                </p>
              </div>
              <Link
                href="/consumer/products"
                className="btn-accent mt-2 flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
              >
                View my products
              </Link>
            </motion.div>
          ) : (
            <motion.div key="failed" {...motionProps} className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500">
                <TriangleAlert size={22} className="text-white" />
              </span>
              <p className="text-sm font-medium">Purchase failed</p>
              <button
                type="button"
                onClick={() => setStage("review")}
                className="mt-2 flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
