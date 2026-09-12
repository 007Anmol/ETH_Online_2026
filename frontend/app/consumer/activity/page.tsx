import type { Metadata } from "next";
import { ActivityDashboard } from "@/components/consumer/activity/ActivityDashboard";
import { RevealGroup } from "@/components/consumer/RevealGroup";
import { BackgroundAmbient } from "@/components/consumer/BackgroundAmbient";

export const metadata: Metadata = {
  title: "Activity — VeriChain",
  description: "Real transfer and resale activity for your wallet.",
};

export default function ConsumerActivityPage() {
  return (
    <div className="relative mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <BackgroundAmbient className="right-0 top-0 h-72 w-72" />

      <RevealGroup>
        <p data-reveal className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Real Hedera testnet activity
        </p>
        <h1
          data-reveal
          className="mt-2 text-2xl font-medium tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl"
        >
          Activity
        </h1>
        <p data-reveal className="mt-2 max-w-lg text-sm text-[var(--muted)]">
          Every real transfer and resale your connected wallet has been part of — as sender,
          receiver, buyer, or seller — backed by actual on-chain transactions and reconciled
          backend records, not app-side guesses.
        </p>
      </RevealGroup>

      <div className="mt-10">
        <ActivityDashboard />
      </div>
    </div>
  );
}
