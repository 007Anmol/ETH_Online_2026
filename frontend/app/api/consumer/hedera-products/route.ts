import { json } from "@/lib/api/http";
import { createServiceClient } from "@/lib/supabase";

/**
 * Lists real, on-chain-backed products (those with an `ownership_records`
 * row) for the "Hedera testnet products" section on the My Products page.
 * Deliberately no auth gate — this only returns product codes and wallet
 * addresses (not secrets), same trust level as `products` already being
 * anon-readable (0007_rls.sql). Actual authorization for transfer/resell
 * still happens per-action in the respective preflight routes.
 */
export async function GET() {
  const supabase = createServiceClient();
  const { data: ownerships, error } = await supabase
    .from("ownership_records")
    .select("product_id, owner_wallet_address, claimed_at")
    .order("claimed_at", { ascending: false });

  if (error) {
    console.error("[consumer/hedera-products] list failed", error);
    return json({ error: "Could not load products" }, 500);
  }

  const productIds = [...new Set((ownerships ?? []).map((o) => o.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, product_code").in("id", productIds)
    : { data: [] };
  const productByid = new Map((products ?? []).map((p) => [p.id, p]));

  // Keep only the most recent ownership row per product.
  const seen = new Set<string>();
  const items = (ownerships ?? [])
    .filter((o) => {
      if (seen.has(o.product_id)) return false;
      seen.add(o.product_id);
      return true;
    })
    .map((o) => ({
      productId: o.product_id,
      productCode: productByid.get(o.product_id)?.product_code ?? o.product_id,
      ownerWalletAddress: o.owner_wallet_address,
    }));

  return json({ products: items });
}
