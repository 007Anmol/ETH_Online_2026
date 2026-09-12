"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Banknote, CheckCircle2, PackageCheck, ShieldCheck } from "lucide-react";
import { ProgressDot } from "@/components/consumer/ProgressDot";

const STEPS = [
  {
    icon: Banknote,
    title: "Buyer funds escrow",
    detail: "HBAR is committed the instant `buy()` is called — held by the contract, not the seller.",
    event: "EscrowFunded",
  },
  {
    icon: PackageCheck,
    title: "NFT transferred",
    detail: "Ownership moves from seller to buyer on-chain, in the very same transaction.",
    event: "NFTTransferred",
  },
  {
    icon: ShieldCheck,
    title: "Seller credited",
    detail: "Proceeds land in the seller's pending balance — a pull payment, so a broken address can't block the sale.",
    event: "EscrowReleased",
  },
  {
    icon: CheckCircle2,
    title: "Sale completed",
    detail: "All of the above happens in one atomic, reentrancy-guarded transaction — no partial state is ever possible.",
    event: "SaleCompleted",
  },
];

const CYCLE_MS = 2600;

/**
 * A live, auto-cycling demonstration of VeriChainMarketplace's real escrow
 * sequence (see the contract's own event log: EscrowFunded -> NFTTransferred
 * -> EscrowReleased -> SaleCompleted, all inside one `buy()` call) — purely
 * illustrative, not tied to an actual pending transaction, so it can safely
 * run continuously without implying a fake "in progress" purchase.
 */
export function EscrowWalkthrough() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setActive((i) => (i + 1) % STEPS.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <div className="vc-card vc-neon-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        How the atomic escrow works
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        A purchase is a single real transaction on Hedera testnet — not four separate steps a
        buyer or seller could get stuck between.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === active;
          return (
            <div
              key={step.event}
              className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors duration-500 ${
                isActive
                  ? "border-[var(--vc-accent)] bg-[var(--vc-accent-soft)]"
                  : "border-[var(--border)]"
              }`}
            >
              <ProgressDot state={isActive ? "current" : index < active ? "completed" : "future"} />
              <div>
                <div className="flex items-center gap-1.5">
                  <Icon size={14} className={isActive ? "text-[var(--vc-accent)]" : "text-[var(--muted)]"} />
                  <p className="text-sm font-medium text-[var(--foreground)]">{step.title}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{step.detail}</p>
                <p className="mt-1.5 font-mono text-[10px] text-[var(--vc-accent)]">{step.event}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={active}
            initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-[var(--muted)]"
          >
            <span className="font-medium text-[var(--foreground)]">Step {active + 1} of 4 — </span>
            {STEPS[active]!.title}: {STEPS[active]!.detail}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
