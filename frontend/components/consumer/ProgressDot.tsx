"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

export type ProgressDotState = "completed" | "current" | "future" | "missing" | "anomaly";

const SIZE = { sm: 10, md: 14 } as const;

/**
 * The one dot/glow language reused across the Claim progress steps, the
 * Journey timeline, and the Proof chain — so the whole verify → journey →
 * proof → claim flow reads as one continuous trust journey rather than four
 * unrelated progress widgets.
 */
export function ProgressDot({
  state,
  size = "md",
}: {
  state: ProgressDotState;
  size?: "sm" | "md";
}) {
  const reduceMotion = useReducedMotion();
  const px = SIZE[size];

  if (state === "completed") {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-[var(--vc-accent)] text-white shadow-[0_0_0_4px_var(--vc-accent-soft)]"
        style={{ width: px, height: px }}
      >
        <Check size={px * 0.6} strokeWidth={3} />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="relative flex shrink-0 items-center justify-center" style={{ width: px, height: px }}>
        {!reduceMotion ? (
          <motion.span
            className="absolute inline-flex rounded-full bg-[var(--vc-accent)]"
            style={{ width: px, height: px }}
            animate={{ opacity: [0.5, 0, 0.5], scale: [1, 2, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <span
            className="absolute inline-flex rounded-full bg-[var(--vc-accent-soft)]"
            style={{ width: px * 1.8, height: px * 1.8 }}
          />
        )}
        <span
          className="relative rounded-full bg-[var(--vc-accent)]"
          style={{ width: px, height: px }}
        />
      </span>
    );
  }

  if (state === "missing") {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full border border-[var(--muted)] bg-[var(--surface-muted)] text-[9px] font-bold text-[var(--muted)]"
        style={{ width: px, height: px }}
      >
        ?
      </span>
    );
  }

  if (state === "anomaly") {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-[var(--vc-danger)] text-[9px] font-bold text-white shadow-[0_0_0_4px_var(--vc-danger-soft)]"
        style={{ width: px, height: px }}
      >
        !
      </span>
    );
  }

  return (
    <span
      className="shrink-0 rounded-full border border-[var(--border)]"
      style={{ width: px, height: px }}
    />
  );
}
