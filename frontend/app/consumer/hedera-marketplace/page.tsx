import type { Metadata } from "next";
import { MarketplaceBrowser } from "@/components/consumer/marketplace/MarketplaceBrowser";
import { MarketplaceSparkles } from "@/components/consumer/marketplace/MarketplaceSparkles";
import { EscrowWalkthrough } from "@/components/consumer/marketplace/EscrowWalkthrough";

export const metadata: Metadata = { title: "VeriChain — Marketplace (Hedera testnet)" };

export default function HederaMarketplacePage() {
  return (
    <div className="vc-neon-panel relative min-h-screen bg-[var(--background)]">
      <MarketplaceSparkles />
      <div className="relative mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Real Hedera testnet marketplace
        </p>
        <h1 className="vc-neon-text mt-2 text-2xl font-semibold sm:text-3xl">
          Consumer resale
        </h1>
        <p className="mt-3 max-w-lg text-sm text-[var(--muted)]">
          Every listing here is a real on-chain escrow — browsing costs nothing, but a purchase
          is a genuine, wallet-signed Hedera transaction.
        </p>

        <div className="mt-8">
          <EscrowWalkthrough />
        </div>

        <div className="mt-10">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Active listings
          </p>
          <MarketplaceBrowser />
        </div>
      </div>
    </div>
  );
}
