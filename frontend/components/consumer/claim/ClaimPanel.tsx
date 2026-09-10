"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Check, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { VerificationBadge } from "@/components/consumer/VerificationBadge";
import { ClaimProgress } from "@/components/consumer/claim/ClaimProgress";
import { ErrorState } from "@/components/consumer/states/ErrorState";
import { LoadingState } from "@/components/consumer/states/LoadingState";
import { RevealGroup } from "@/components/consumer/RevealGroup";
import { useClaimProduct } from "@/lib/consumer/hooks/use-claim-product";
import type { ConsumerProduct, VerificationOutcome } from "@/lib/consumer/types";

export function ClaimPanel({
  product,
  outcome,
}: {
  product: ConsumerProduct;
  outcome: VerificationOutcome;
}) {
  const { eligibility, stage, error, claim, retry } = useClaimProduct(product.productId);
  const reduceMotion = useReducedMotion();
  const announcedSuccess = useRef(false);

  useEffect(() => {
    if (stage === "success" && !announcedSuccess.current) {
      announcedSuccess.current = true;
      toast.success("Product claimed", {
        description: `${product.name} is now in your VeriChain collection.`,
      });
    }
  }, [stage, product.name]);

  if (stage === "checking") {
    return <LoadingState label="Checking claim eligibility" />;
  }

  if (stage === "failure") {
    return (
      <ErrorState
        title="Couldn't claim this product"
        description={error ?? "Something went wrong."}
        onRetry={claim}
      />
    );
  }

  if (stage === "success" || eligibility === "ALREADY_OWNED") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="owned"
          initial={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="vc-card mx-auto w-full max-w-sm rounded-2xl border border-[var(--vc-accent)]/30 bg-[var(--surface)] p-6 text-center"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--vc-success-soft)] text-[var(--vc-success)]">
            <Check size={26} strokeWidth={2} />
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
            {stage === "success" ? "Product claimed" : "Already yours"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {stage === "success"
              ? "This product is now associated with your VeriChain identity."
              : "This product is already associated with your VeriChain identity."}
          </p>
          <Button href="/consumer/products" className="mt-6">
            View My Products
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (eligibility === "NOT_ELIGIBLE") {
    return (
      <ErrorState
        title="Not eligible to claim"
        description="This product isn't available to claim yet."
        onRetry={retry}
      />
    );
  }

  const claiming = stage === "processing";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <RevealGroup className="text-center">
        <h1 data-reveal className="text-2xl font-medium tracking-[-0.03em] text-[var(--foreground)]">
          Claim your product
        </h1>
        <p data-reveal className="mt-3 text-sm leading-6 text-[var(--muted)]">
          This verified product can now be associated with your VeriChain identity.
        </p>
      </RevealGroup>

      <div className="vc-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <VerificationBadge outcome={outcome} />
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)]">
            <Package size={16} strokeWidth={1.5} />
          </span>
        </div>
        <h2 className="mt-3 text-base font-medium text-[var(--foreground)]">{product.name}</h2>
        <p className="mt-1 font-mono text-xs text-[var(--muted)]">{product.productId}</p>
        <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
          {product.manufacturerName}
        </p>
      </div>

      <ClaimProgress stage={stage} />

      <button
        type="button"
        disabled={claiming}
        onClick={() => void claim()}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] px-6 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-8px_var(--vc-accent-glow)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none motion-reduce:hover:translate-y-0"
      >
        {claiming ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Claiming product…
          </>
        ) : (
          "Claim product"
        )}
      </button>
    </div>
  );
}
