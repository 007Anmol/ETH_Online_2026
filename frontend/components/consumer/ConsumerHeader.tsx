"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_LINKS = [
  { href: "/consumer", label: "Home" },
  { href: "/consumer/scan", label: "Scan" },
  { href: "/consumer/products", label: "My products" },
  { href: "/consumer/marketplace", label: "Marketplace" },
  { href: "/consumer/profile", label: "Profile" },
] as const;

export function ConsumerHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/75 backdrop-blur-xl">
      <Container>
        <nav className="flex h-16 items-center justify-between">
          <Logo />

          <div className="hidden items-center gap-1 text-sm text-[var(--muted)] md:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-full px-3.5 py-1.5 transition-colors hover:text-[var(--foreground)] ${
                    active ? "text-[var(--foreground)]" : ""
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="consumer-nav-active"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)]"
                    />
                  ) : null}
                  <span className="relative">{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </nav>
      </Container>
    </header>
  );
}
