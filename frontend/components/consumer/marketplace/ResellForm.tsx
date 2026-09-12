"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Tag, TriangleAlert } from "lucide-react";
import { ownershipProvider, marketplaceProvider } from "@/lib/consumer/registry";
import { FlowSteps } from "@/components/consumer/shared/FlowSteps";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import { formatUsd } from "@/lib/format";
import type { MarketplaceListing, OwnedProduct } from "@/lib/consumer/types";

const STEPS = ["Price", "Review", "Listed"];

type Stage = "price" | "review" | "processing" | "listed" | "failed";

export function ResellForm({ productId }: { productId: string }) {
  const shouldReduceMotion = useReducedMotion();
  const [product, setProduct] = useState<OwnedProduct | null | undefined>(undefined);
  const [stage, setStage] = useState<Stage>("price");
  const [price, setPrice] = useState("");
  const [listing, setListing] = useState<MarketplaceListing | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ownershipProvider.listOwnedProducts().then((products) => {
      if (cancelled) return;
      setProduct(products.find((entry) => entry.productId === productId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const priceNumber = Number(price);
  const priceValid = price.trim().length > 0 && Number.isFinite(priceNumber) && priceNumber > 0;
  const stepIndex = stage === "price" ? 0 : stage === "review" ? 1 : 2;

  async function createListing() {
    setStage("processing");
    try {
      const created = await marketplaceProvider.createListing(productId, priceNumber);
      setListing(created);
      setStage("listed");
    } catch {
      setStage("failed");
    }
  }

  if (product === undefined) {
    return <LoadingState label="Loading product" />;
  }

  if (product === null) {
    return (
      <ErrorState
        title="Product not found in your collection"
        description="Only products you currently own can be listed for resale."
      />
    );
  }

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
      <div className="flex items-center gap-3 border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)]">
          <Tag size={18} />
        </div>
        <div>
          <p className="text-sm font-medium">{product.name}</p>
          <p className="font-mono text-xs text-[var(--muted)]">{product.productCode}</p>
        </div>
      </div>

      {stage !== "listed" && stage !== "failed" ? (
        <div className="mt-6">
          <FlowSteps steps={STEPS} currentIndex={stepIndex} />
        </div>
      ) : null}

      <div className="mt-6 border border-[var(--border)] bg-[var(--surface)] p-6">
        <AnimatePresence mode="wait">
          {stage === "price" ? (
            <motion.div key="price" {...motionProps}>
              <p className="text-sm font-medium">Set your asking price</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Buyers will see this price on the marketplace, in USD.
              </p>

              <div className="mt-4 flex h-12 items-center border border-[var(--border)] bg-[var(--background)] px-3 focus-within:border-[var(--foreground)]">
                <span className="text-sm text-[var(--muted)]">$</span>
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="ml-1 h-full w-full bg-transparent text-sm outline-none"
                />
                <span className="text-xs text-[var(--muted)]">USD</span>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={!priceValid}
                  onClick={() => setStage("review")}
                  className="btn-accent flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium disabled:opacity-40"
                >
                  Continue to review
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          ) : null}

          {stage === "review" ? (
            <motion.div key="review" {...motionProps}>
              <p className="text-sm font-medium">Review listing</p>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Product</dt>
                  <dd className="text-right font-medium">{product.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Asking price</dt>
                  <dd className="text-right font-medium">{formatUsd(priceNumber)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-start gap-3 border border-amber-500/20 bg-amber-500/[0.04] p-4">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-5 text-[var(--muted)]">
                  Your product stays in your collection until a buyer
                  completes purchase. You can cancel the listing any time.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage("price")}
                  className="flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void createListing()}
                  className="btn-accent flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  <Tag size={16} />
                  Create listing
                </button>
              </div>
            </motion.div>
          ) : null}

          {stage === "processing" ? (
            <motion.div
              key="processing"
              {...motionProps}
              className="flex flex-col items-center gap-3 py-10 text-center"
            >
              <Loader2 size={28} className="animate-spin text-[var(--muted)]" />
              <p className="text-sm font-medium">Creating listing…</p>
            </motion.div>
          ) : null}

          {stage === "listed" && listing ? (
            <motion.div
              key="listed"
              {...motionProps}
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
                <Check size={24} className="text-white" strokeWidth={3} />
              </span>
              <div>
                <p className="text-sm font-medium">Listed for {formatUsd(listing.priceUsd)}</p>
                <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                  {product.name} is now visible to other consumers on the
                  marketplace.
                </p>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <Link
                  href="/consumer/marketplace?tab=mine"
                  className="btn-accent flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  View my listings
                </Link>
                <Link
                  href="/consumer/products"
                  className="flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
                >
                  My products
                </Link>
              </div>
            </motion.div>
          ) : null}

          {stage === "failed" ? (
            <motion.div
              key="failed"
              {...motionProps}
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500">
                <TriangleAlert size={22} className="text-white" />
              </span>
              <div>
                <p className="text-sm font-medium">Couldn&apos;t create listing</p>
                <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                  Something went wrong. No listing was created.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStage("review")}
                className="mt-2 flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
              >
                Try again
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
