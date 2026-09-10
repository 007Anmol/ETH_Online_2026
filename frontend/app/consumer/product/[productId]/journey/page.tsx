import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JourneyTimeline } from "@/components/consumer/journey/JourneyTimeline";
import { RevealGroup } from "@/components/consumer/RevealGroup";
import { EmptyState } from "@/components/consumer/states/EmptyState";
import { BackgroundAmbient } from "@/components/consumer/BackgroundAmbient";
import { productDataProvider } from "@/lib/consumer/providers";
import { Route as RouteIcon } from "lucide-react";

export async function generateMetadata({
  params,
}: PageProps<"/consumer/product/[productId]/journey">): Promise<Metadata> {
  const { productId } = await params;
  return {
    title: `Journey — ${decodeURIComponent(productId)} — VeriChain`,
    description: "The supply-chain checkpoints this product has passed through.",
  };
}

export default async function ConsumerProductJourneyPage({
  params,
}: PageProps<"/consumer/product/[productId]/journey">) {
  const { productId: rawProductId } = await params;
  const productId = decodeURIComponent(rawProductId).trim().toUpperCase();

  const journey = await productDataProvider.getJourney(productId);

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

      <RevealGroup className="mt-6 mb-10 text-center">
        <p data-reveal className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          Product journey
        </p>
        <h1
          data-reveal
          className="mt-2 text-2xl font-medium tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl"
        >
          Where this product has been
        </h1>
      </RevealGroup>

      <div className="flex justify-center">
        {journey && journey.events.length > 0 ? (
          <JourneyTimeline events={journey.events} />
        ) : (
          <EmptyState
            icon={RouteIcon}
            title="No journey available"
            description="We don't have a supply-chain record for this product."
          />
        )}
      </div>
    </div>
  );
}
