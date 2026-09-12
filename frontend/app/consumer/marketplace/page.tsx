import type { Metadata } from "next";
import { Suspense } from "react";
import { Store } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { MarketplaceBrowser } from "@/components/consumer/marketplace/MarketplaceBrowser";
import { LoadingState } from "@/components/consumer/states/LoadingState";

export const metadata: Metadata = {
  title: "VeriChain — Marketplace",
};

export default function MarketplacePage() {
  return (
    <Container className="py-10 lg:py-14">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <Store size={14} />
        </span>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
          Consumer resale
        </p>
      </div>
      <h1 className="gradient-text mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
        Marketplace
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
        Buy verified products listed by other consumers, or manage the
        products you&apos;ve listed for resale.
      </p>

      <Suspense fallback={<div className="mt-8"><LoadingState label="Loading marketplace" /></div>}>
        <MarketplaceBrowser />
      </Suspense>
    </Container>
  );
}
