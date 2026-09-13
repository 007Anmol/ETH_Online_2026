"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Factory,
  PackageCheck,
  Route,
  ShieldCheck,
} from "lucide-react";
import { Container } from "../ui/Container";

const steps = [
  {
    number: "01",
    title: "Create",
    description:
      "The manufacturer registers the product, binds its physical identity, and creates its digital twin.",
    icon: Factory,
  },
  {
    number: "02",
    title: "Move",
    description:
      "Custody transfers are recorded as the product moves through distributors and logistics providers.",
    icon: Route,
  },
  {
    number: "03",
    title: "Verify",
    description:
      "Physical scans and shipment evidence are checked against the expected lifecycle.",
    icon: ShieldCheck,
  },
  {
    number: "04",
    title: "Settle",
    description:
      "When the evidence is consistent, ownership and programmable settlement can proceed.",
    icon: PackageCheck,
  },
];

export function Lifecycle() {
  return (
    <section id="how-it-works" className="border-y border-[var(--border)] py-24 lg:py-32">
      <Container>
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--foreground)]" />

              <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                The lifecycle
              </span>
            </div>

            <h2 className="max-w-xl text-4xl font-medium leading-[1.05] tracking-[-0.05em] lg:text-5xl">
              From physical evidence
              <br />
              <span className="text-[var(--muted)]">to verifiable action.</span>
            </h2>
          </div>

          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
            A shared verification layer for every participant in the product
            lifecycle.
          </p>
        </div>

        <div className="mt-16 grid gap-0 border-t border-[var(--border)] md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group border-b border-[var(--border)] p-6 lg:border-b-0 lg:border-r lg:p-8 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[var(--muted)]">
                    {step.number}
                  </span>

                  <Icon
                    size={18}
                    strokeWidth={1.3}
                    className="text-[var(--muted)] transition-colors group-hover:text-[var(--foreground)]"
                  />
                </div>

                <h3 className="mt-12 text-xl font-medium tracking-[-0.03em]">
                  {step.title}
                </h3>

                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  {step.description}
                </p>

                <div className="mt-8 flex items-center gap-2 text-xs text-[var(--muted)]">
                  <Check size={13} />
                  Verifiable event
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}