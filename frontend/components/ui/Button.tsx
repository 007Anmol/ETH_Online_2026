import Link from "next/link";
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
      ? "bg-[var(--foreground)] text-[var(--background)] hover:opacity-85"
      : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--foreground)]";

  return (
    <Link
      href={href}
      className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-all duration-300 ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}