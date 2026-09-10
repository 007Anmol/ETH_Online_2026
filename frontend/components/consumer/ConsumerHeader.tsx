"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CenteredAlert } from "@/components/consumer/CenteredAlert";
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
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  async function handleSignOut() {
    setConfirmSignOut(false);
    await logout();
    toast("Signed out");
  }

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
                      ? "bg-[var(--vc-accent)] text-white"
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
                  onClick={() => setConfirmSignOut(true)}
                  aria-label={`Sign out of ${identity.displayName}`}
                  className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--vc-accent)] hover:text-[var(--vc-accent)] sm:flex"
                >
                  {identity.displayName}
                  <LogOut size={13} strokeWidth={1.75} />
                </button>
              ) : (
                <Link
                  href="/consumer/login"
                  className="hidden items-center rounded-full border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--vc-accent)] hover:text-[var(--vc-accent)] sm:flex"
                >
                  Sign in
                </Link>
              )
            ) : null}

            <Link
              href="/consumer/scan"
              className="hidden items-center gap-2 rounded-full bg-[var(--vc-accent)] px-4 py-2 text-xs font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_var(--vc-accent-glow)] sm:flex"
            >
              <ScanLine size={14} />
              Scan product
            </Link>
          </div>
        </nav>
      </Container>

      {identity ? (
        <CenteredAlert
          open={confirmSignOut}
          tone="confirm"
          title="Sign out?"
          description="You'll need to sign in again to see your verified products."
          confirmLabel="Sign out"
          onConfirm={handleSignOut}
          cancelLabel="Cancel"
          onCancel={() => setConfirmSignOut(false)}
        />
      ) : null}
    </header>
  );
}
