import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ListingDetail } from "@/components/consumer/marketplace/ListingDetail";

export const metadata: Metadata = {
  title: "VeriChain — Listing",
};

export default async function ListingPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;

  return (
    <Container className="py-10 lg:py-14">
      <Link
        href="/consumer/marketplace"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} />
        Marketplace
      </Link>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Listing
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
        Product listing
      </h1>

      <ListingDetail listingId={listingId} />
    </Container>
  );
}
