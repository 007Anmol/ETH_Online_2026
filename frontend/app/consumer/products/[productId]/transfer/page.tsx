import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { TransferFlow } from "@/components/consumer/transfer/TransferFlow";

export const metadata: Metadata = {
  title: "VeriChain — Transfer ownership",
};

export default async function TransferPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return (
    <Container className="py-10 lg:py-14">
      <Link
        href="/consumer/products"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} />
        My products
      </Link>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Ownership transfer
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
        Transfer this product
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
        Send this product&apos;s NFT to another wallet. Ownership moves
        immediately once the transfer is confirmed.
      </p>

      <TransferFlow productId={productId} />
    </Container>
  );
}
