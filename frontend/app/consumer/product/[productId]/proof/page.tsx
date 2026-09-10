import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldOff } from "lucide-react";
import { ProofStatusHero } from "@/components/consumer/proof/ProofStatusHero";
import { ProofSummaryCard } from "@/components/consumer/proof/ProofSummaryCard";
import { ProofTechnicalDetails } from "@/components/consumer/proof/ProofTechnicalDetails";
import { ProofFlowDiagram } from "@/components/consumer/proof/ProofFlowDiagram";
import { EmptyState } from "@/components/consumer/states/EmptyState";
import { PageOrbAccent } from "@/components/consumer/three/PageOrbAccent";
import { productDataProvider } from "@/lib/consumer/providers";

export async function generateMetadata({
  params,
}: PageProps<"/consumer/product/[productId]/proof">): Promise<Metadata> {
  const { productId } = await params;
  return {
    title: `Blockchain proof — ${decodeURIComponent(productId)} — VeriChain`,
    description: "The on-chain evidence backing this product's verification record.",
  };
}

export default async function ConsumerProductProofPage({
  params,
}: PageProps<"/consumer/product/[productId]/proof">) {
  const { productId: rawProductId } = await params;
  const productId = decodeURIComponent(rawProductId).trim().toUpperCase();

  const proof = await productDataProvider.getBlockchainProof(productId);

  return (
    <div className="relative mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <PageOrbAccent className="left-1/2 top-0 h-72 w-72 -translate-x-1/2" />

      <Link
        href={`/consumer/product/${encodeURIComponent(productId)}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Product
      </Link>

      <div className="mt-8">
        {!proof ? (
          <div className="flex justify-center">
            <EmptyState
              icon={ShieldOff}
              title="No blockchain proof to show"
              description="We don't have a product record to match a blockchain proof against."
            />
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
            <ProofStatusHero state={proof.state} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ProofSummaryCard proof={proof} />
              <ProofFlowDiagram state={proof.state} />
            </div>

            <ProofTechnicalDetails proof={proof} />
          </div>
        )}
      </div>
    </div>
  );
}
