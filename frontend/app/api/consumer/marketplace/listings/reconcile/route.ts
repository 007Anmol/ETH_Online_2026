import { getOnChainListing, tinybarsToHbarString } from "@verichain/hedera";
import { json, readJson } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

type ReconcileBody = {
  productId?: string;
  productIdHash?: `0x${string}`;
  txHash?: `0x${string}`;
};

/**
 * Real reconciliation for listing creation. Hedera is authoritative: reads
 * the listing back on-chain (never trusts the client's claim that
 * createListing succeeded) before writing the off-chain `resale_listings`
 * index row.
 */
export async function POST(request: Request) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const parsed = await readJson<ReconcileBody>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const { productId, productIdHash, txHash } = parsed.body;
  if (!productId || !productIdHash || !txHash) {
    return json({ error: "productId, productIdHash, and txHash are required" }, 400);
  }

  const onChainListing = await getOnChainListing(productIdHash);
  if (onChainListing.status !== "Active") {
    console.log(
      JSON.stringify({
        event: "marketplace.listing.verification_failed",
        source: "backend",
        productId,
        txHash,
        onChainStatus: onChainListing.status,
        timestamp: new Date().toISOString(),
      }),
    );
    return json({ verified: false });
  }

  console.log(
    JSON.stringify({
      event: "marketplace.listing.confirmed",
      source: "blockchain",
      productId,
      txHash,
      priceHbar: tinybarsToHbarString(onChainListing.priceTinybars),
      timestamp: new Date().toISOString(),
    }),
  );

  const supabase = createServiceClient();

  // Idempotent: resale_listings has no idempotency_key column (no migration
  // for it was applied), so re-running reconcile for the same on-chain
  // listing is made safe by checking for an existing INITIATED row first,
  // rather than inserting a duplicate index row for the one real listing.
  const { data: existingListing } = await supabase
    .from("resale_listings")
    .select("id")
    .eq("product_id", productId)
    .eq("status", "INITIATED")
    .maybeSingle();
  if (existingListing) {
    return json({ verified: true, synced: true, listingId: existingListing.id, idempotent: true });
  }

  const { data: listing, error: insertError } = await supabase
    .from("resale_listings")
    .insert({
      product_id: productId,
      seller_wallet_address: session.walletAddress.toLowerCase(),
      status: "INITIATED",
    })
    .select("id")
    .single();

  if (insertError || !listing) {
    console.error("[marketplace/listings/reconcile] Supabase sync failed", insertError);
    return json({ verified: true, synced: false });
  }

  return json({ verified: true, synced: true, listingId: listing.id });
}
