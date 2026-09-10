import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductIdentityVisual } from "@/components/consumer/product/ProductIdentityVisual";
import { VerificationBadge } from "@/components/consumer/VerificationBadge";
import type { CollectionItem } from "@/lib/consumer/hooks/use-product-collection";

export function ProductCollectionCard({ item }: { item: CollectionItem }) {
  return (
    <Link
      href={`/consumer/product/${encodeURIComponent(item.productId)}`}
      className="vc-card group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vc-accent)]"
    >
      <div className="p-4 pb-0">
        <ProductIdentityVisual category={item.product?.category ?? null} />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">
            {item.product?.manufacturerName ?? "VeriChain"}
          </p>
          <VerificationBadge outcome={item.verification} />
        </div>

        <h3 className="mt-2 line-clamp-1 text-sm font-medium text-[var(--foreground)]">
          {item.name}
        </h3>
        <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">{item.productId}</p>

        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--muted)] transition-colors group-hover:text-[var(--vc-accent)]">
          View product
          <ArrowRight
            size={13}
            strokeWidth={2}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </Link>
  );
}
