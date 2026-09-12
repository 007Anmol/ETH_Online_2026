"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <motion.div
        whileHover={{ rotate: 10, scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 320, damping: 14 }}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[var(--foreground)] bg-[var(--surface)]"
      >
        <span className="absolute inset-0 rounded-full bg-[var(--accent)] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40" />
        <span
          className="relative h-2 w-2 rounded-full"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        />
      </motion.div>

      <span className="text-sm font-semibold tracking-[-0.02em]">
        PRAM<span className="text-[var(--accent)]">AAN</span>
      </span>
    </Link>
  );
}
