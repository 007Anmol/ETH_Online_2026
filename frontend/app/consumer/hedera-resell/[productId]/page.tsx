import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase";
import { ResellPanel } from "@/components/consumer/marketplace/ResellPanel";
import { ErrorState } from "@/components/consumer/states/ErrorState";

export const metadata: Metadata = { title: "VeriChain — List for resale" };

export default async function HederaResellPage({
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
      <ResellPanel
        productId={product.id}
        productCode={product.product_code}
        currentOwnerWallet={ownership?.owner_wallet_address ?? null}
      />
    </div>
  );
}
