"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, LockKeyhole } from "lucide-react";
import { Container } from "../ui/Container";

export function TrustSection() {
  return (
    <section className="py-32 lg:py-44">
      <Container>
        <div className="grid gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--foreground)]" />

              <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                When evidence changes
              </span>
            </div>

            <h2 className="max-w-lg text-4xl font-medium leading-[1.05] tracking-[-0.05em] lg:text-5xl">
              Trust is not a
              <br />
              <span className="text-[var(--muted)]">static certificate.</span>
            </h2>

            <p className="mt-6 max-w-md text-base leading-7 text-[var(--muted)]">
              PRAMAAN  connects physical-world evidence with programmable
              actions. When the expected lifecycle and the observed evidence
              diverge, the system can surface the anomaly and protect the
              settlement process.
            </p>

            <button className="mt-8 flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-60">
              Explore verification
              <ArrowUpRight size={15} />
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 lg:p-8"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Shipment monitor
                </p>

                <h3 className="mt-2 text-lg font-medium">
                  Rado Watch #1024
                </h3>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]">
                <LockKeyhole size={16} strokeWidth={1.5} />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={18}
                  strokeWidth={1.5}
                  className="mt-0.5 text-amber-600 dark:text-amber-400"
                />

                <div>
                  <p className="text-sm font-medium">Evidence mismatch detected</p>

                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    Observed custody event does not match the expected shipment
                    route.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">
                  Physical evidence
                </span>

                <span className="text-xs font-medium">Inconsistent</span>
              </div>

              <div className="h-px bg-[var(--border)]" />

              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">
                  Settlement status
                </span>

                <span className="text-xs font-medium">Protected</span>
              </div>

              <div className="h-px bg-[var(--border)]" />

              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">
                  Next action
                </span>

                <span className="text-xs font-medium">Review required</span>
              </div>
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <p className="text-xs leading-5 text-[var(--muted)]">
                A verification event can become an actionable signal—not just
                a record.
              </p>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}