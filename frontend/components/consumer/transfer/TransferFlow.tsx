"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Check,
  Loader2,
  PackageCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { ownershipProvider, transferProvider } from "@/lib/consumer/registry";
import { FlowSteps } from "@/components/consumer/shared/FlowSteps";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import type { OwnedProduct, TransferRecord } from "@/lib/consumer/types";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const STEPS = ["Recipient", "Review", "Confirm"];

type Stage = "recipient" | "review" | "processing" | "success" | "failed";

export function TransferFlow({ productId }: { productId: string }) {
  const shouldReduceMotion = useReducedMotion();
  const [product, setProduct] = useState<OwnedProduct | null | undefined>(undefined);
  const [stage, setStage] = useState<Stage>("recipient");
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState(false);
  const [record, setRecord] = useState<TransferRecord | null>(null);
  const [processingLabel, setProcessingLabel] = useState("Waiting for wallet confirmation…");

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

  const addressValid = ADDRESS_PATTERN.test(address.trim());
  const stepIndex = stage === "recipient" ? 0 : stage === "review" ? 1 : 2;

  async function runTransfer() {
    setStage("processing");
    setProcessingLabel("Waiting for wallet confirmation…");

    try {
      const initiated = await transferProvider.initiateTransfer(productId, address.trim());
      setProcessingLabel("Confirming on-chain…");
      const confirmed = await transferProvider.getTransfer(initiated.transferId);
      setRecord(confirmed);
      setStage(confirmed?.status === "confirmed" ? "success" : "failed");
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
        description="Only products you currently own can be transferred."
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
          <PackageCheck size={18} />
        </div>
        <div>
          <p className="text-sm font-medium">{product.name}</p>
          <p className="font-mono text-xs text-[var(--muted)]">{product.productCode}</p>
        </div>
      </div>

      {stage !== "success" && stage !== "failed" ? (
        <div className="mt-6">
          <FlowSteps steps={STEPS} currentIndex={stepIndex} />
        </div>
      ) : null}

      <div className="mt-6 border border-[var(--border)] bg-[var(--surface)] p-6">
        <AnimatePresence mode="wait">
          {stage === "recipient" ? (
            <motion.div key="recipient" {...motionProps}>
              <p className="text-sm font-medium">Recipient wallet address</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Enter the wallet address that should receive this product&apos;s NFT.
              </p>

              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="0x..."
                spellCheck={false}
                className="mt-4 h-12 w-full rounded-none border border-[var(--border)] bg-[var(--background)] px-3 font-mono text-sm outline-none focus:border-[var(--foreground)]"
              />
              {touched && address.length > 0 && !addressValid ? (
                <p className="mt-2 text-xs text-red-600">
                  Enter a valid wallet address (0x followed by 40 hex characters).
                </p>
              ) : null}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={!addressValid}
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
              <p className="text-sm font-medium">Review transfer</p>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Product</dt>
                  <dd className="text-right font-medium">{product.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Sending to</dt>
                  <dd className="text-right font-mono text-xs">{address.trim()}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-start gap-3 border border-amber-500/20 bg-amber-500/[0.04] p-4">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-5 text-[var(--muted)]">
                  This action cannot be undone. Once transferred, this product will
                  no longer appear in your collection.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage("recipient")}
                  className="flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void runTransfer()}
                  className="btn-accent flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
                >
                  <Wallet size={16} />
                  Confirm &amp; transfer
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
              <p className="text-sm font-medium">{processingLabel}</p>
              <p className="max-w-xs text-xs text-[var(--muted)]">
                This is a simulated transfer — no real wallet signature or
                blockchain transaction is submitted yet.
              </p>
            </motion.div>
          ) : null}

          {stage === "success" && record ? (
            <motion.div
              key="success"
              {...motionProps}
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
                <Check size={24} className="text-white" strokeWidth={3} />
              </span>
              <div>
                <p className="text-sm font-medium">Transfer confirmed</p>
                <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                  {product.name} has been transferred to{" "}
                  <span className="font-mono text-xs">{record.toAddress}</span>.
                </p>
              </div>
              <Link
                href="/consumer/products"
                className="btn-accent mt-2 flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
              >
                Back to my products
              </Link>
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
                <p className="text-sm font-medium">Transfer failed</p>
                <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                  Something went wrong confirming this transfer. No ownership
                  changes were made.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStage("review")}
                className="mt-2 flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition-colors hover:border-[var(--foreground)]"
              >
                <ArrowLeftRight size={16} />
                Try again
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
