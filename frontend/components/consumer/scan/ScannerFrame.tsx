"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ScanLine } from "lucide-react";
import { VerificationOrb } from "@/components/consumer/three/VerificationOrb";
import type { ScannerState } from "@/lib/consumer/hooks/use-product-scanner";

const LABELS: Partial<Record<ScannerState, string>> = {
  idle: "Ready to scan",
  reading: "Reading product identity…",
  identified: "Product identified",
  verifying: "Verifying…",
};

export function ScannerFrame({ state }: { state: ScannerState }) {
  const reduceMotion = useReducedMotion();
  const active = state === "reading" || state === "verifying";

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-3xl border bg-[var(--surface)] transition-[border-color] duration-500 sm:h-60 sm:w-60"
        style={{ borderColor: active ? "var(--vc-accent)" : "var(--border)" }}
        animate={
          reduceMotion
            ? undefined
            : active
              ? { boxShadow: "0 0 0 6px var(--vc-accent-soft)" }
              : {
                  boxShadow: [
                    "0 0 0 0px var(--vc-accent-soft)",
                    "0 0 0 5px var(--vc-accent-soft)",
                    "0 0 0 0px var(--vc-accent-soft)",
                  ],
                }
        }
        transition={
          active
            ? { duration: 0.4 }
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <VerificationOrb className="absolute inset-0" interactive={!active} />

        <div className="absolute inset-4 rounded-2xl border border-dashed border-[var(--border)]" />

        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)]/80 backdrop-blur-sm">
          <ScanLine
            size={24}
            strokeWidth={1.5}
            className={active ? "text-[var(--vc-accent)]" : "text-[var(--muted)]"}
          />
        </div>

        {active && !reduceMotion ? (
          <motion.div
            className="absolute inset-x-4 h-0.5 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--vc-accent), transparent)",
              boxShadow: "0 0 12px var(--vc-accent-glow)",
            }}
            initial={{ top: "16%" }}
            animate={{ top: ["16%", "84%", "16%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}

        {active ? (
          <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
            {!reduceMotion ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--vc-accent)] opacity-75" />
            ) : null}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--vc-accent)]" />
          </span>
        ) : null}
      </motion.div>

      <p role="status" aria-live="polite" className="text-sm font-medium text-[var(--muted)]">
        {LABELS[state] ?? ""}
      </p>
    </div>
  );
}
