import { json } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

/** Lists active resale listings with basic product info for the marketplace browse page. */
export async function GET() {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);

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
