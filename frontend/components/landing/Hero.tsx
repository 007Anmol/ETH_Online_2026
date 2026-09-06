"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";
import { ThreeHero } from "@/components/landing/ThreeHero";
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 lg:pt-32">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8 flex items-center gap-3"
            >
              <span className="h-px w-8 bg-[var(--foreground)]" />

              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                Physical trust infrastructure
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="max-w-2xl text-[clamp(3.5rem,7vw,6.5rem)] font-medium leading-[0.94] tracking-[-0.07em]"
            >
              Every product.
              <br />
              <span className="inline-block bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
  Verifiable.
</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 max-w-lg text-base leading-7 text-[var(--muted)] lg:text-lg"
            >
              PRAMAAN connects physical authentication, supply-chain
              verification, anomaly detection, and programmable settlement
              into one verifiable product lifecycle.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Button href="#how-it-works">
                Explore the platform
                <ArrowUpRight size={16} className="ml-2" />
              </Button>

              <Button href="#identity" variant="secondary">
                See a verified product
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 flex items-center gap-3 text-xs text-[var(--muted)]"
            >
              <Check size={14} />
              Built for manufacturers, distributors, logistics, retailers, and
              consumers.
            </motion.div>
          </div>

          {/* Right — product identity visual */}
          {/* Right — Three.js product visual */}
<motion.div
  initial={{ opacity: 0, scale: 0.96 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.9, delay: 0.2 }}
  className="relative h-[500px] w-full lg:h-[620px]"
>
  <ThreeHero />

  {/* Floating identity card */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, delay: 0.8 }}
    className="absolute bottom-4 left-4 w-[230px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl shadow-black/[0.03] backdrop-blur-xl dark:shadow-black/20"
  >
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
        Physical identity
      </span>

      <span className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Verified
      </span>
    </div>

    <div className="mt-4 text-sm font-medium">
      Rado Watch #1024
    </div>

    <div className="mt-2 font-mono text-[10px] text-[var(--muted)]">
      VC-001024
    </div>

    <div className="mt-4 border-t border-[var(--border)] pt-3 text-[10px] text-[var(--muted)]">
      Digital twin · Custody recorded
    </div>
  </motion.div>

  {/* Small status label */}
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay: 1 }}
    className="absolute right-2 top-12 hidden items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-[var(--muted)] sm:flex"
  >
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
    Onchain identity
  </motion.div>
</motion.div>
        </div>
      </Container>
    </section>
  );
}