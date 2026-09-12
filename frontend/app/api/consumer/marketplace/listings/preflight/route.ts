import { getOnChainListing } from "@verichain/hedera";
import { json, readJson } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

type PreflightBody = { productId?: string; priceHbar?: number };

/** Real preflight for creating a resale listing — validates ownership and
 *  product safety server-side before any wallet signature is requested. */
export async function POST(request: Request) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const parsed = await readJson<PreflightBody>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const { productId, priceHbar } = parsed.body;

  if (!productId || !priceHbar || priceHbar <= 0) {
    return json({ error: "productId and a positive priceHbar are required" }, 400);
  }

  const sellerWallet = session.walletAddress.toLowerCase();
  const supabase = createServiceClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, product_id_hash, status")
    .eq("id", productId)
    .maybeSingle();
  if (productError) return json({ error: "Could not load product" }, 500);
  if (!product) return json({ error: "Product not found" }, 404);
  if (product.status === "SUSPECT_COUNTERFEIT" || product.status === "REVOKED") {
    return json({ error: "This product has been flagged and cannot be listed" }, 409);
  }

  const { data: ownership, error: ownershipError } = await supabase
    .from("ownership_records")
    .select("owner_wallet_address")
    .eq("product_id", productId)
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ownershipError) return json({ error: "Could not load ownership record" }, 500);
  if (!ownership || ownership.owner_wallet_address.toLowerCase() !== sellerWallet) {
    return json({ error: "You do not currently own this product" }, 403);
  }

  const productIdHash = product.product_id_hash as `0x${string}`;
  const onChainListing = await getOnChainListing(productIdHash);
  if (onChainListing.status === "Active") {
    return json({ error: "This product already has an active listing" }, 409);
  }

  console.log(
    JSON.stringify({
      event: "marketplace.listing.preflight.validated",
      source: "backend",
      productId,
      sellerWallet,
      priceHbar,
      timestamp: new Date().toISOString(),
    }),
  );

  return json({ ok: true, productIdHash, sellerWallet: ownership.owner_wallet_address });
}
