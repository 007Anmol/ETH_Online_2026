import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Route as RouteIcon, ShieldCheck, Sparkles, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductStatusHero } from "@/components/consumer/product/ProductStatusHero";
import { ProductIdentityVisual } from "@/components/consumer/product/ProductIdentityVisual";
import { ProductMetadataGrid } from "@/components/consumer/product/ProductMetadataGrid";
import { TrustSummaryList } from "@/components/consumer/product/TrustSummaryList";
import { ManufacturerCard } from "@/components/consumer/product/ManufacturerCard";
import { ProductIdentityHeading } from "@/components/consumer/product/ProductIdentityHeading";
import { ProductNotFound } from "@/components/consumer/product/ProductNotFound";
import { BackgroundAmbient } from "@/components/consumer/BackgroundAmbient";
import { ownershipProvider, productDataProvider } from "@/lib/consumer/providers";

export async function generateMetadata({
  params,
}: PageProps<"/consumer/product/[productId]">): Promise<Metadata> {
  const { productId } = await params;
  return {
    title: `${decodeURIComponent(productId)} — VeriChain`,
    description: "Product identity, trust summary, and verification record.",
  };
}

export default async function ConsumerProductPage({
  params,
}: PageProps<"/consumer/product/[productId]">) {
  const { productId: rawProductId } = await params;
  const productId = decodeURIComponent(rawProductId).trim().toUpperCase();

  const [product, run] = await Promise.all([
    productDataProvider.getProduct(productId),
    productDataProvider.verifyProduct(productId),
  ]);

  const claimEligibility =
    product && run.outcome === "VERIFIED"
      ? await ownershipProvider.getClaimEligibility(productId)
      : null;

  return (
    <div className="relative mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
      <BackgroundAmbient className="right-0 top-0 h-72 w-72" />

      <Link
        href="/consumer/scan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Scan another product
      </Link>

      <div className="mt-6">
        {!product ? (
          <ProductNotFound run={run} />
        ) : (
          <div className="flex flex-col gap-6">
            <ProductStatusHero outcome={run.outcome} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
                <ProductIdentityVisual category={product.category} />
                <ProductIdentityHeading product={product} />
              </div>

              <div className="flex flex-col gap-6">
                <ProductMetadataGrid product={product} />
                <TrustSummaryList steps={run.steps} />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    href={`/consumer/product/${encodeURIComponent(product.productId)}/journey`}
                    className="gap-2"
                  >
                    <RouteIcon size={16} strokeWidth={2} />
                    View supply chain journey
                  </Button>
                  <Button
                    href={`/consumer/product/${encodeURIComponent(product.productId)}/proof`}
                    variant="secondary"
                    className="gap-2"
                  >
                    <ShieldCheck size={16} strokeWidth={2} />
                    View blockchain proof
                  </Button>
                </div>

                {claimEligibility === "ELIGIBLE" ? (
                  <Button
                    href={`/consumer/product/${encodeURIComponent(product.productId)}/claim`}
                    variant="secondary"
                    className="gap-2 border-[var(--vc-accent)] text-[var(--vc-accent)]"
                  >
                    <Sparkles size={16} strokeWidth={2} />
                    Claim product
                  </Button>
                ) : claimEligibility === "ALREADY_OWNED" ? (
                  <Button href="/consumer/products" variant="secondary" className="gap-2">
                    <PackageCheck size={16} strokeWidth={2} />
                    View in My Products
                  </Button>
                ) : null}
              </div>
            </div>

            <ManufacturerCard product={product} />
          </div>
        )}
      </div>
    </div>
  );
}
