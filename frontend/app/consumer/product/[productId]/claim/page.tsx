import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClaimPanel } from "@/components/consumer/claim/ClaimPanel";
import { EmptyState } from "@/components/consumer/states/EmptyState";
import { BackgroundAmbient } from "@/components/consumer/BackgroundAmbient";
import { productDataProvider } from "@/lib/consumer/providers";
import { SearchX } from "lucide-react";

export async function generateMetadata({
  params,
}: PageProps<"/consumer/product/[productId]/claim">): Promise<Metadata> {
  const { productId } = await params;
  return {
    title: `Claim — ${decodeURIComponent(productId)} — VeriChain`,
    description: "Associate this verified product with your VeriChain identity.",
  };
}

export default async function ConsumerProductClaimPage({
  params,
}: PageProps<"/consumer/product/[productId]/claim">) {
  const { productId: rawProductId } = await params;
  const productId = decodeURIComponent(rawProductId).trim().toUpperCase();

  const [product, run] = await Promise.all([
    productDataProvider.getProduct(productId),
    productDataProvider.verifyProduct(productId),
  ]);

  return (
    <div className="relative mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <BackgroundAmbient className="left-1/2 top-0 h-72 w-72 -translate-x-1/2" />

      <Link
        href={`/consumer/product/${encodeURIComponent(productId)}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Product
      </Link>

      <div className="mt-8">
        {!product ? (
          <div className="flex justify-center">
            <EmptyState
              icon={SearchX}
              title="Nothing to claim"
              description="We don't have a verified record for this product ID."
            />
          </div>
        ) : (
          <ClaimPanel product={product} outcome={run.outcome} />
        )}
      </div>
    </div>
  );
}
