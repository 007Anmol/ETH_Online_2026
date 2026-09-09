"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isManufacturerRole, type Session } from "@/lib/types";

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
          { href: "/scan", label: "Scan" },
        ]
      : [
          { href: "/scan", label: "Scan" },
          { href: "/simulator", label: "Simulator" },
        ]
    : [
        { href: "/login", label: "Login" },
        { href: "/scan", label: "Scan" },
      ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
          VeriChain
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
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
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
              className="rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Log out
            </button>
          ) : null}
        </nav>
      </div>
      {session ? (
        <div className="border-t border-zinc-100 bg-zinc-50">
          <div className="mx-auto flex w-full max-w-6xl justify-between px-4 py-1.5 text-xs text-zinc-500">
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
