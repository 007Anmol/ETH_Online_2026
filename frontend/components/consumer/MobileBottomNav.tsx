"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, ScanLine, Package, Store, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/consumer", label: "Home", icon: Home, emphasized: false },
  { href: "/consumer/products", label: "Products", icon: Package, emphasized: false },
  { href: "/consumer/scan", label: "Scan", icon: ScanLine, emphasized: true },
  { href: "/consumer/marketplace", label: "Market", icon: Store, emphasized: false },
  { href: "/consumer/profile", label: "Profile", icon: User, emphasized: false },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--background)]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, emphasized }) => {
          const active = pathname === href;

          if (emphasized) {
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={label}>
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full text-white shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    boxShadow: "0 10px 26px -8px var(--accent-glow)",
                  }}
                >
                  <Icon size={20} strokeWidth={1.75} />
                </motion.span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                active ? "text-[var(--foreground)]" : "text-[var(--muted)]"
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />
              {label}
              {active ? (
                <motion.span
                  layoutId="mobile-nav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute bottom-0.5 h-1 w-1 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
