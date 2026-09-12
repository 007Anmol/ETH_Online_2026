import type { Metadata } from "next";
import { ProductCollectionGrid } from "@/components/consumer/products/ProductCollectionGrid";
import { HederaProductsSection } from "@/components/consumer/products/HederaProductsSection";
import { RevealGroup } from "@/components/consumer/RevealGroup";
import { BackgroundAmbient } from "@/components/consumer/BackgroundAmbient";

export const metadata: Metadata = {
  title: "My Products — VeriChain",
  description: "Your verified product collection.",
};

export default function ConsumerProductsPage() {
  return (
    <div className="relative mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
      <BackgroundAmbient className="left-0 top-0 h-96 w-96" />

      <RevealGroup>
        <p data-reveal className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Your collection
        </p>
        <h1
          data-reveal
          className="mt-2 text-2xl font-medium tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl"
        >
          My Products
        </h1>
      </RevealGroup>

      <div className="mt-10">
        <ProductCollectionGrid />
      </div>

      <HederaProductsSection />
    </div>
  );
}
