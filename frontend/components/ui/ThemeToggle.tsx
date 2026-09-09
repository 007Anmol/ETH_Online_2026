"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "../ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
    >
      {theme === "light" ? (
        <Moon size={15} strokeWidth={1.5} />
      ) : (
        <Sun size={15} strokeWidth={1.5} />
      )}
    </button>
  );
}