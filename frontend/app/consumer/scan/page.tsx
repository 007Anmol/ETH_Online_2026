import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ScanPanel } from "@/components/consumer/scan/ScanPanel";

export const metadata: Metadata = {
  title: "VeriChain — Scan a product",
};

export default function ConsumerScanPage() {
  return (
    <Container className="py-10 lg:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Consumer verification
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
        Check this product
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
        Pick a product to run its identity, manufacturer, supply-chain, and
        blockchain checks — the same checks a real NFC tap runs against the
        chain.
      </p>

      <ScanPanel />
    </Container>
  );
}
