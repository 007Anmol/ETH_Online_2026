import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase";
import { TransferPanel } from "@/components/consumer/transfer/TransferPanel";
import { ErrorState } from "@/components/consumer/states/ErrorState";

export const metadata: Metadata = {
  title: "VeriChain — Real Hedera transfer",
};

/**
 * Real-Hedera transfer demo route, deliberately separate from the existing
 * mock `/consumer/product/[productId]` tree (which is keyed by the demo
 * catalog's fictional product codes, not real database rows) — `productId`
 * here is a real `products.id` UUID. See CONSUMER_BACKEND_PLAN.md and this
 * session's audit for why these two are not unified yet.
 */
export default async function HederaTransferPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = createServiceClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, product_code, product_id_hash, status")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <ErrorState title="Product not found" description="No real product matches this ID." />
      </div>
    );
  }

  const { data: ownership } = await supabase
    .from("ownership_records")
    .select("owner_wallet_address")
    .eq("product_id", productId)
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <TransferPanel
        productId={product.id}
        productCode={product.product_code}
        productIdHash={product.product_id_hash as `0x${string}`}
        currentOwnerWallet={ownership?.owner_wallet_address ?? null}
      />
    </div>
  );
}
