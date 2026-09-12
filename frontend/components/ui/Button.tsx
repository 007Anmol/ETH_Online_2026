"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
};

export function Button({
  children,
  href = "#",
  variant = "primary",
  className = "",
}: ButtonProps) {
  const styles =
    variant === "primary"
      ? "btn-accent"
      : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]";

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="inline-block">
      <Link
        href={href}
        className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-300 ${styles} ${className}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}
