"use client";

import Link from "next/link";
import {
  Activity,
  Box,
  CircleDollarSign,
  Factory,
  Handshake,
  LayoutDashboard,
  ScanLine,
  Tag,
  Truck,
} from "lucide-react";
import { DEMO_PRODUCT } from "@/lib/demoProduct";

const navigation = [
  { label: "Manufacturing", href: "/manufacturing", icon: Factory },
  { label: "Logistics", href: "/shipments", icon: Truck },
  { label: "Sale", href: "/settlement", icon: Handshake },
  { label: "Product history", href: `/product/${DEMO_PRODUCT.logisticsId}`, icon: Tag },
];

const extra = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Checkpoints", href: "/checkpoints", icon: Activity },
  { label: "Verification", href: "/verification", icon: ScanLine },
  { label: "Payments", href: "/payments", icon: CircleDollarSign },
];

export default function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:block">
      <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--accent)]">
          <Box size={16} />
        </div>

        <div>
          <p className="text-sm font-semibold tracking-tight">VERICHAIN</p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Protocol
          </p>
        </div>
      </div>

      <div className="px-4 py-6">
        <p className="eyebrow mb-3 px-3">
          Operations
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-[var(--border)] pt-6">
          <p className="eyebrow mb-3 px-3">
            More
          </p>
          {extra.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}