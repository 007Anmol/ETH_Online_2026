import { getOnChainListing } from "@verichain/hedera";
import { json, readJson } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

type CancelBody = { productId?: string; productIdHash?: `0x${string}`; txHash?: `0x${string}` };

/** Real reconciliation for listing cancellation — verifies on-chain before
 *  updating the off-chain index. */
export async function POST(request: Request) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const parsed = await readJson<CancelBody>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const { productId, productIdHash, txHash } = parsed.body;
  if (!productId || !productIdHash || !txHash) {
    return json({ error: "productId, productIdHash, and txHash are required" }, 400);
  }

  const onChainListing = await getOnChainListing(productIdHash);
  if (onChainListing.status !== "Cancelled") {
    return json({ verified: false });
  }
  if (onChainListing.seller.toLowerCase() !== session.walletAddress.toLowerCase()) {
    return json({ error: "Only the seller can cancel this listing" }, 403);
  }

  console.log(
    JSON.stringify({
      event: "marketplace.listing.cancelled",
      source: "blockchain",
      productId,
      txHash,
      timestamp: new Date().toISOString(),
    }),
  );

  const supabase = createServiceClient();
  const { error: updateError } = await supabase
    .from("resale_listings")
    .update({ status: "CANCELLED" })
    .eq("product_id", productId)
    .eq("status", "INITIATED");

  return json({ verified: true, synced: !updateError });
}
