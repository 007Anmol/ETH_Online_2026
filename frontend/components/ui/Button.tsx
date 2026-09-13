import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "solid" | "outline" | "ghost";
};

export function Button({
  children,
  href = "#",
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles =
    variant === "primary" || variant === "solid"
      ? "bg-[var(--foreground)] text-[var(--background)] hover:opacity-85"
      : variant === "secondary" || variant === "outline"
        ? "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--foreground)]"
        : "text-[var(--muted)] hover:bg-[var(--surface-muted)]";

  const classNames = `inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-all duration-300 ${styles} ${className}`;

  if (href) return <Link href={href} className={classNames}>{children}</Link>;
  return <button className={classNames} {...props}>{children}</button>;
}
