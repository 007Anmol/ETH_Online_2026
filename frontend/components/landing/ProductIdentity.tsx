"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Check, Copy, Fingerprint } from "lucide-react";
import { Container } from "../ui/Container";

const details = [
  ["Product ID", "VC-001024"],
  ["Token ID", "1024"],
  ["Serial Number", "RADO123456"],
  ["Batch ID", "BATCH-001"],
  ["NFC Tag", "TAG-8A91"],
];

export function ProductIdentity() {
  return (
    <section id="identity" className="py-32 lg:py-44">
      <Container>
        <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--foreground)]" />

              <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                The digital twin
              </span>
            </div>

            <h2 className="max-w-md text-4xl font-medium leading-[1.05] tracking-[-0.05em] lg:text-5xl">
              One identity.
              <br />
              <span className="text-[var(--muted)]">
                Every verified event.
              </span>
            </h2>

            <p className="mt-6 max-w-md text-base leading-7 text-[var(--muted)]">
              Each physical product receives a unique identity that connects
              its physical evidence with its onchain record.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="border-b border-[var(--border)] p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Verified product
                  </p>

                  <h3 className="mt-3 text-2xl font-medium tracking-[-0.04em]">
                    Rado Watch #1024
                  </h3>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)]">
                  <Fingerprint size={18} strokeWidth={1.5} />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Identity verified
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              {details.map(([label, value], index) => (
                <div
                  key={label}
                  className={`border-b border-[var(--border)] p-6 ${
                    index % 2 === 0
                      ? "sm:border-r"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--muted)]">
                      {label}
                    </span>

                    <Copy size={13} className="text-[var(--muted)]" />
                  </div>

                  <div className="mt-3 font-mono text-sm">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-6 lg:p-8">
              <div>
                <p className="text-xs text-[var(--muted)]">Current status</p>
                <p className="mt-1 text-sm font-medium">Ready for transfer</p>
              </div>

              <button className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-60">
                View provenance
                <ArrowUpRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}