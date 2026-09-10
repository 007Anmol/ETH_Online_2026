import { Button } from "@/components/ui/Button";
import { ProductStatusHero } from "@/components/consumer/product/ProductStatusHero";
import { TrustSummaryList } from "@/components/consumer/product/TrustSummaryList";
import type { VerificationRun } from "@/lib/consumer/types";

export function ProductNotFound({ run }: { run: VerificationRun }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <ProductStatusHero outcome="NOT_FOUND" />
      <TrustSummaryList steps={run.steps} />
      <p className="text-center text-sm leading-6 text-[var(--muted)]">
        {run.summary}
      </p>
      <Button href="/consumer/scan" className="mx-auto">
        Try another product
      </Button>
    </div>
  );
}
