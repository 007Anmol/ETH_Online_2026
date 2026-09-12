import { json } from "@/lib/api/http";
import { createServiceClient } from "@/lib/supabase";

/**
 * Lists active resale listings with basic product info for the marketplace
 * browse page. Deliberately no auth gate — same trust level as
 * GET /api/consumer/hedera-products (browsing is non-sensitive; actual
 * purchase/listing/cancel actions remain requireConsumer()-gated).
 */
export async function GET() {
  const supabase = createServiceClient();
  const { data: listings, error } = await supabase
    .from("resale_listings")
    .select("id, product_id, seller_wallet_address, status, created_at")
    .eq("status", "INITIATED")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[marketplace/listings] list failed", error);
    return json({ error: "Could not load listings" }, 500);
  }

  const productIds = (listings ?? []).map((listing) => listing.product_id);
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, product_code").in("id", productIds)
    : { data: [] };
  const productByid = new Map((products ?? []).map((product) => [product.id, product]));

  return json({
    listings: (listings ?? []).map((listing) => ({
      ...listing,
      productCode: productByid.get(listing.product_id)?.product_code ?? null,
    })),
  });
}
