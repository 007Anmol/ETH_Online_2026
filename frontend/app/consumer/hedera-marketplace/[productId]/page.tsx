import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase";
import { ListingPanel } from "@/components/consumer/marketplace/ListingPanel";
import { ErrorState } from "@/components/consumer/states/ErrorState";

export const metadata: Metadata = { title: "VeriChain — Listing (Hedera testnet)" };

export default async function HederaListingPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = createServiceClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, product_code, product_id_hash")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <ErrorState title="Product not found" description="No real product matches this ID." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <ListingPanel
        productId={product.id}
        productCode={product.product_code}
        productIdHash={product.product_id_hash as `0x${string}`}
      />
    </div>
  );
}
