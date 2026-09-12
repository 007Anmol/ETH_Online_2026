import type { Metadata } from "next";
import { MarketplaceBrowser } from "@/components/consumer/marketplace/MarketplaceBrowser";

export const metadata: Metadata = { title: "VeriChain — Marketplace (Hedera testnet)" };

export default function HederaMarketplacePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        Real Hedera testnet marketplace
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
        Consumer resale
      </h1>
      <MarketplaceBrowser />
    </div>
  );
}
