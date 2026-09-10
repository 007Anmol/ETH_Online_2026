"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import type { VerificationStep } from "@/lib/consumer/types";

function StepIcon({ status }: { status: VerificationStep["status"] }) {
  if (status === "passed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--vc-success-soft)] text-[var(--vc-success)]">
        <Check size={12} strokeWidth={2.5} />
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--vc-danger-soft)] text-[var(--vc-danger)]">
        <X size={12} strokeWidth={2.5} />
      </span>
    );
  }

  if (status === "checking") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
        <Loader2 size={12} strokeWidth={2.5} className="animate-spin" />
      </span>
    );
  }

  return <span className="h-5 w-5 rounded-full border border-[var(--border)]" />;
}

export function VerificationStepsList({ steps }: { steps: VerificationStep[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <ul className="w-full max-w-sm space-y-3">
      {steps.map((step, index) => (
        <motion.li
          key={step.id}
          initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: reduceMotion ? 0 : index * 0.08 }}
          className="flex items-center gap-3"
        >
          <StepIcon status={step.status} />
          <span
            className={`text-sm ${
              step.status === "pending" ? "text-[var(--muted)]" : "text-[var(--foreground)]"
            }`}
          >
            {step.label}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
