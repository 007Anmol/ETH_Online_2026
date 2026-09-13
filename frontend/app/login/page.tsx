"use client";

import { LoginForm } from "./login-form";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Fingerprint } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:72px_72px]" />

      <header className="relative z-10 flex items-center justify-between border-b border-[var(--border)] px-6 py-5 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--foreground)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--foreground)]" />
          </span>
          <span className="text-sm font-semibold tracking-[0.18em]">PRAMAAN</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] sm:inline">
            Manufacturer access / 2026
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-73px)] w-full max-w-7xl items-center gap-14 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24 lg:px-10 lg:py-20">
        <section className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-7 flex items-center gap-3"
          >
            <span className="h-px w-8 bg-[var(--foreground)]" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Physical trust infrastructure
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-xl text-[clamp(3.2rem,7vw,6.6rem)] font-medium leading-[0.94] tracking-[-0.07em]"
          >
            Make every
            <br />
            product <span className="verifiable-highlight">verifiable.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 max-w-lg text-base leading-7 text-[var(--muted)] lg:text-lg"
          >
            Connect the physical identity of every product to a living digital
            record. Your manufacturer workspace begins with a verified wallet
            and a unique human proof.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-12 grid max-w-lg grid-cols-2 border-y border-[var(--border)]"
          >
            <div className="border-r border-[var(--border)] py-5 pr-5">
              <Fingerprint size={18} strokeWidth={1.4} />
              <p className="mt-4 text-xs font-medium">Unique identity</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">One product, one digital twin.</p>
            </div>
            <div className="py-5 pl-5">
              <Check size={18} strokeWidth={1.4} />
              <p className="mt-4 text-xs font-medium">Verified access</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Wallet and World ID protected.</p>
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, delay: 0.2 }}
          className="w-full max-w-md justify-self-center lg:justify-self-end"
        >
          <div className="mb-5 flex items-end justify-between gap-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Manufacturer portal</p>
              <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em]">Enter your workspace</h2>
            </div>
            <span className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Secure
            </span>
          </div>
          <LoginForm />
          <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[var(--muted)]">
            Authentication is private, signed, and recorded onchain.
            <ArrowUpRight size={13} />
          </p>
        </motion.section>
      </div>
    </main>
  
  );
}
