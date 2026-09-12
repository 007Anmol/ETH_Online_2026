import { getOnChainListing, tinybarsToHbarString } from "@verichain/hedera";
import { json } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

/** Read-only listing detail — on-chain price/status/seller is authoritative;
 *  actual purchase validation still happens in purchase/preflight. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { productId } = await params;

  const supabase = createServiceClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id, product_code, product_id_hash, status")
    .eq("id", productId)
    .maybeSingle();

  if (error) return json({ error: "Could not load product" }, 500);
  if (!product) return json({ error: "Product not found" }, 404);

  const listing = await getOnChainListing(product.product_id_hash as `0x${string}`);

  return json({
    productId: product.id,
    productCode: product.product_code,
    productStatus: product.status,
    listing: {
      status: listing.status,
      seller: listing.seller,
      priceTinybars: listing.priceTinybars.toString(),
      priceHbar: tinybarsToHbarString(listing.priceTinybars),
    },
  });
}
