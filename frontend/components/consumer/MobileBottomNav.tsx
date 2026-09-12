"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ScanLine, Store, User, type LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  emphasized?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/consumer", label: "Home", icon: Home },
  { href: "/consumer/products", label: "Products", icon: Package },
  { href: "/consumer/scan", label: "Scan", icon: ScanLine, emphasized: true },
  { href: "/consumer/hedera-marketplace", label: "Market", icon: Store },
  { href: "/consumer/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, href: string) {
  if (href === "/consumer") return pathname === "/consumer";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Consumer navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between px-4">
        {ITEMS.map(({ href, label, icon: Icon, emphasized }) => {
          const active = isActive(pathname, href);

          if (emphasized) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="flex flex-1 items-center justify-center py-2"
              >
                <span className="-translate-y-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--vc-accent)] text-white shadow-[0_8px_20px_-6px_var(--vc-accent-glow)]">
                  <Icon size={20} strokeWidth={2} />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-[var(--vc-accent)]" : "text-[var(--muted)]"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
