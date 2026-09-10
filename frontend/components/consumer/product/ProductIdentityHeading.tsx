import { RevealGroup } from "@/components/consumer/RevealGroup";
import type { ConsumerProduct } from "@/lib/consumer/types";

export function ProductIdentityHeading({ product }: { product: ConsumerProduct }) {
  return (
    <RevealGroup>
      <p data-reveal className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
        {product.manufacturerName}
      </p>
      <h1
        data-reveal
        className="mt-2 text-2xl font-medium tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl"
      >
        {product.name}
      </h1>
      <p data-reveal className="mt-1 font-mono text-xs text-[var(--muted)]">
        {product.productId}
      </p>
    </RevealGroup>
  );
}
