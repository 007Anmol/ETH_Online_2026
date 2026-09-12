import { getOnChainListing } from "@verichain/hedera";
import { json, readJson } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";
import { HEDERA_CONSUMER_MARKETPLACE_ADDRESS, HEDERA_CONSUMER_NFT_ADDRESS } from "@verichain/shared";

type PreflightBody = { productId?: string };

/**
 * Real purchase preflight. The on-chain listing (price, seller, status) is
 * authoritative — never re-derives the price from anything client-supplied.
 * Product-safety (SUSPECT_COUNTERFEIT/REVOKED) is re-checked here even
 * though the contract's own `blocked` mapping is the final gate, per
 * defense-in-depth.
 */
export async function POST(request: Request) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const parsed = await readJson<PreflightBody>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const { productId } = parsed.body;
  if (!productId) return json({ error: "productId is required" }, 400);

  const supabase = createServiceClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, product_id_hash, status")
    .eq("id", productId)
    .maybeSingle();
  if (productError) return json({ error: "Could not load product" }, 500);
  if (!product) return json({ error: "Product not found" }, 404);
  if (product.status === "SUSPECT_COUNTERFEIT" || product.status === "REVOKED") {
    return json({ error: "This product has been flagged and cannot be purchased" }, 409);
  }

  const productIdHash = product.product_id_hash as `0x${string}`;
  const listing = await getOnChainListing(productIdHash);

  if (listing.status !== "Active") {
    return json({ error: "This listing is not active" }, 409);
  }
  if (listing.seller.toLowerCase() === session.walletAddress.toLowerCase()) {
    return json({ error: "You cannot buy your own listing" }, 400);
  }

  console.log(
    JSON.stringify({
      event: "marketplace.purchase.preflight.validated",
      source: "backend",
      productId,
      buyer: session.walletAddress.toLowerCase(),
      seller: listing.seller.toLowerCase(),
      priceTinybars: listing.priceTinybars.toString(),
      timestamp: new Date().toISOString(),
    }),
  );

  return json({
    ok: true,
    productIdHash,
    sellerWallet: listing.seller,
    priceTinybars: listing.priceTinybars.toString(),
    nftContractAddress: HEDERA_CONSUMER_NFT_ADDRESS,
    marketplaceContractAddress: HEDERA_CONSUMER_MARKETPLACE_ADDRESS,
  });
}
