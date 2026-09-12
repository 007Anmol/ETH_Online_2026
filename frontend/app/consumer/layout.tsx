import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConsumerShell } from "@/components/consumer/ConsumerShell";

export const metadata: Metadata = {
  title: "VeriChain — Verify a product",
  description: "Scan a product to see its verified identity, journey, and blockchain proof.",
};

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  return <ConsumerShell>{children}</ConsumerShell>;
}
