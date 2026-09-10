import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VerificationBadge } from "@/components/consumer/VerificationBadge";
import { productDataProvider } from "@/lib/consumer/providers";

const DEMO_PRODUCT_ID = "VC-001024";

export async function RecentVerificationDemo() {
  const [product, run] = await Promise.all([
    productDataProvider.getProduct(DEMO_PRODUCT_ID),
    productDataProvider.verifyProduct(DEMO_PRODUCT_ID),
  ]);

  if (!product) return null;

  return (
    <section className="border-b border-[var(--border)] py-20 lg:py-28">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-2 lg:px-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            See it in action
          </p>
          <h2 className="mt-4 max-w-sm text-3xl font-medium leading-[1.05] tracking-[-0.04em] lg:text-4xl">
            This is what a verification looks like.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
            Every scan runs the same four checks and gives you a clear answer —
            no blockchain knowledge required.
          </p>

          <Button href="/consumer/scan" className="mt-8 gap-2">
            <ScanLine size={16} strokeWidth={2} />
            Try scanning a product
          </Button>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl shadow-black/[0.03]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--muted)]">{product.productId}</span>
            <VerificationBadge outcome={run.outcome} />
          </div>

          <h3 className="mt-4 text-lg font-medium text-[var(--foreground)]">{product.name}</h3>
          <p className="text-sm text-[var(--muted)]">{product.manufacturerName}</p>

          <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-6 text-[var(--muted)]">
            {run.summary}
          </p>
        </div>
      </div>
    </section>
  );
}
