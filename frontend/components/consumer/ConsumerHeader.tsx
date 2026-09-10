"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ScanLine } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useConsumerIdentity } from "@/lib/consumer/hooks/use-consumer-identity";

const NAV_LINKS = [
  { href: "/consumer", label: "Home" },
  { href: "/consumer/products", label: "My products" },
  { href: "/consumer/profile", label: "Profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/consumer") return pathname === "/consumer";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ConsumerHeader() {
  const pathname = usePathname();
  const { identity, status, logout } = useConsumerIdentity();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-xl">
      <Container>
        <nav className="flex h-16 items-center justify-between">
          <Logo />

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {status !== "checking" ? (
              identity ? (
                <button
                  type="button"
                  onClick={logout}
                  aria-label={`Sign out of ${identity.displayName}`}
                  className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)] sm:flex"
                >
                  {identity.displayName}
                  <LogOut size={13} strokeWidth={1.75} />
                </button>
              ) : (
                <Link
                  href="/consumer/login"
                  className="hidden items-center rounded-full border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--foreground)] sm:flex"
                >
                  Sign in
                </Link>
              )
            ) : null}

            <Link
              href="/consumer/scan"
              className="hidden items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2 text-xs font-medium text-[var(--background)] transition-opacity hover:opacity-85 sm:flex"
            >
              <ScanLine size={14} />
              Scan product
            </Link>
          </div>
        </nav>
      </Container>
    </header>
  );
}
