"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ScanLine } from "lucide-react";
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
      <div className="relative flex h-48 w-48 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] sm:h-56 sm:w-56">
        <div className="absolute inset-4 rounded-2xl border border-dashed border-[var(--border)]" />

        <ScanLine
          size={40}
          strokeWidth={1.25}
          className={active ? "text-[var(--foreground)]" : "text-[var(--muted)]"}
        />

        {active && !reduceMotion ? (
          <motion.div
            className="absolute inset-x-4 h-0.5 bg-[var(--foreground)]"
            initial={{ top: "16%" }}
            animate={{ top: ["16%", "84%", "16%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}

        {active ? (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[var(--foreground)]" />
        ) : null}
      </div>

      <p role="status" aria-live="polite" className="text-sm font-medium text-[var(--muted)]">
        {LABELS[state] ?? ""}
      </p>
    </div>
  );
}
