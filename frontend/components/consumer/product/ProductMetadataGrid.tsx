import { productCategoryLabel } from "@/lib/types";
import { formatDate, formatOrNotAvailable } from "@/lib/consumer/format";
import type { ConsumerProduct } from "@/lib/consumer/types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export function ProductMetadataGrid({ product }: { product: ConsumerProduct }) {
  return (
    <div className="vc-card grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-4">
      <Field label="Category" value={productCategoryLabel(product.category)} />
      <Field label="Origin" value={formatOrNotAvailable(product.origin)} />
      <Field label="Manufactured" value={formatDate(product.manufacturingDate)} />
      <Field label="Product ID" value={product.productId} />
    </div>
  );
}
