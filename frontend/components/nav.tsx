"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isManufacturerRole, type Session } from "@/lib/types";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type NavProps = {
  session: Session | null;
};

export function Nav({ session }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const links = session
    ? isManufacturerRole(session.role)
      ? [
          { href: "/manufacturer", label: "Dashboard" },
          { href: "/manufacturer/batches", label: "Batches" },
          { href: "/manufacturer/products", label: "Products" },
          { href: "/manufacturer/nfc", label: "NFC bind" },
          { href: "/simulator", label: "Simulator" },
        ]
      : [
          { href: "/simulator", label: "Simulator" },
        ]
    : [
        { href: "/login", label: "Login" },
      ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.16em]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--foreground)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--foreground)]" />
          </span>
          PRAMAAN
        </Link>
        <nav className="flex flex-1 flex-wrap items-center justify-end gap-1">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2.5 py-1.5 text-sm ${
                  active
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {session ? (
            <button
              type="button"
              onClick={logout}
              className="rounded-md px-2.5 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            >
              Log out
            </button>
          ) : null}
          <ThemeToggle />
        </nav>
      </div>
      {session ? (
        <div className="border-t border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="mx-auto flex w-full max-w-6xl justify-between px-4 py-1.5 text-xs text-[var(--muted)]">
            <span>
              {session.displayName ?? "Signed in"} · {session.role}
            </span>
            <span className="font-mono">{session.walletAddress}</span>
          </div>
        </div>
      ) : null}
    </header>
  );
}
