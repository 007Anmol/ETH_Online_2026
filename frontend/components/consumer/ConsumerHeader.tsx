"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
