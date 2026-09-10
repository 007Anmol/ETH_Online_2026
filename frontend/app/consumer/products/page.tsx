import type { Metadata } from "next";
import { ProductCollectionGrid } from "@/components/consumer/products/ProductCollectionGrid";
import { RevealGroup } from "@/components/consumer/RevealGroup";

export const metadata: Metadata = {
  title: "My Products — VeriChain",
  description: "Your verified product collection.",
};

export default function ConsumerProductsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
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
    </div>
  );
}
