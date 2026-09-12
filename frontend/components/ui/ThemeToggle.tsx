"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "light" ? (
          <motion.span
            key="moon"
            initial={{ rotate: -60, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex"
          >
            <Moon size={15} strokeWidth={1.5} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: -60, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex"
          >
            <Sun size={15} strokeWidth={1.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
