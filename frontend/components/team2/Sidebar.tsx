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
    <aside className="hidden min-h-screen w-60 shrink-0 border-r border-gray-200 bg-white lg:block">
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
          <Box size={16} />
        </div>

        <div>
          <p className="text-sm font-semibold tracking-tight">VERICHAIN</p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400">
            Protocol
          </p>
        </div>
      </div>

      <div className="px-4 py-6">
        <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400">
          Operations
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-black"
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400">
            More
          </p>
          {extra.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-black"
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