"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CenteredAlertTone = "confirm" | "success" | "danger";

const TONE_PRESENTATION: Record<CenteredAlertTone, { icon: LucideIcon; className: string }> = {
  confirm: { icon: HelpCircle, className: "bg-[var(--vc-accent-soft)] text-[var(--vc-accent)]" },
  success: { icon: Check, className: "bg-[var(--vc-success-soft)] text-[var(--vc-success)]" },
  danger: { icon: AlertTriangle, className: "bg-[var(--vc-danger-soft)] text-[var(--vc-danger)]" },
};

/**
 * A centered, modal confirmation/notice for actions that genuinely need the
 * user's attention (claiming a product, signing out) — as opposed to
 * Sonner's corner toasts, which stay reserved for minor, non-blocking
 * feedback (copy-to-clipboard, etc). Used to gate critical actions behind
 * an explicit confirm, not just to report after the fact.
 */
export function CenteredAlert({
  open,
  tone,
  title,
  description,
  confirmLabel,
  onConfirm,
  cancelLabel = "Cancel",
  onCancel,
  busy = false,
}: {
  open: boolean;
  tone: CenteredAlertTone;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const { icon: Icon, className } = TONE_PRESENTATION[tone];

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="centered-alert-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.15 }}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-2xl"
          >
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${className}`}>
              <Icon size={26} strokeWidth={2} />
            </div>

            <h2 id="centered-alert-title" className="mt-4 text-lg font-semibold text-[var(--foreground)]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                ref={confirmRef}
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--vc-accent)] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : null}
                {confirmLabel}
              </button>

              {onCancel ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onCancel}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-6 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelLabel}
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
