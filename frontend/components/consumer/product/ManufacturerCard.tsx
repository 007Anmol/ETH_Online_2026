import { formatOrNotAvailable } from "@/lib/consumer/format";
import type { ConsumerProduct } from "@/lib/consumer/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function ManufacturerCard({ product }: { product: ConsumerProduct }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Manufacturer</p>

      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-sm font-medium text-[var(--foreground)]">
          {initials(product.manufacturerName) || "—"}
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">{product.manufacturerName}</p>
          <p className="text-xs text-[var(--muted)]">Registered manufacturer</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Origin</dt>
          <dd className="mt-1 text-sm text-[var(--foreground)]">
            {formatOrNotAvailable(product.origin)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">
            Registered product
          </dt>
          <dd className="mt-1 font-mono text-sm text-[var(--foreground)]">{product.productId}</dd>
        </div>
      </dl>
    </div>
  );
}
