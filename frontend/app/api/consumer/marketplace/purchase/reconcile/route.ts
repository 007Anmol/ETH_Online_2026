import { getConsumerNftOwner, getOnChainListing } from "@verichain/hedera";
import { json, readJson } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";
import { HEDERA_CONSUMER_MARKETPLACE_ADDRESS, HEDERA_CONSUMER_NFT_ADDRESS } from "@verichain/shared";

type ReconcileBody = {
  productId?: string;
  productIdHash?: `0x${string}`;
  txHash?: `0x${string}`;
  idempotencyKey?: string;
};

/**
 * Real settlement reconciliation. Verifies BOTH the NFT ownership change
 * and the on-chain listing status before writing anything durable — per
 * CONSUMER_BACKEND_PLAN.md, "receipt success alone" is never sufficient.
 */
export async function POST(request: Request) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;
  const buyer = session.walletAddress.toLowerCase();

  const parsed = await readJson<ReconcileBody>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const { productId, productIdHash, txHash, idempotencyKey } = parsed.body;
  if (!productId || !productIdHash || !txHash) {
    return json({ error: "productId, productIdHash, and txHash are required" }, 400);
  }

  const supabaseForIdempotency = createServiceClient();
  if (idempotencyKey) {
    const { data: existingSettlement } = await supabaseForIdempotency
      .from("resale_settlements")
      .select("id, status, sync_status")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingSettlement) {
      // Retried reconcile for the same purchase attempt — return the
      // existing settlement instead of re-verifying/re-inserting.
      return json({
        verified: existingSettlement.status === "COMPLETED",
        synced: existingSettlement.sync_status === "SYNCED",
        idempotent: true,
      });
    }
  }

  console.log(
    JSON.stringify({
      event: "marketplace.purchase.confirming",
      source: "backend",
      productId,
      txHash,
      timestamp: new Date().toISOString(),
    }),
  );

  const [newOwner, listing] = await Promise.all([
    getConsumerNftOwner(productIdHash),
    getOnChainListing(productIdHash),
  ]);

  const ownershipVerified = newOwner?.toLowerCase() === buyer;
  const saleVerified = listing.status === "Sold";

  if (!ownershipVerified || !saleVerified) {
    console.log(
      JSON.stringify({
        event: "marketplace.purchase.verification_failed",
        source: "backend",
        productId,
        txHash,
        ownershipVerified,
        saleVerified,
        timestamp: new Date().toISOString(),
      }),
    );
    return json({ verified: false });
  }

  console.log(
    JSON.stringify({
      event: "marketplace.ownership.verified",
      source: "blockchain",
      productId,
      txHash,
      buyer,
      timestamp: new Date().toISOString(),
    }),
  );
  console.log(
    JSON.stringify({
      event: "marketplace.sale.completed",
      source: "blockchain",
      productId,
      txHash,
      timestamp: new Date().toISOString(),
    }),
  );

  const supabase = supabaseForIdempotency;

  const { data: listingRow } = await supabase
    .from("resale_listings")
    .select("id, seller_wallet_address")
    .eq("product_id", productId)
    .eq("status", "INITIATED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sellerWallet = listingRow?.seller_wallet_address ?? listing.seller.toLowerCase();
  let synced = true;

  if (listingRow) {
    const { error: listingUpdateError } = await supabase
      .from("resale_listings")
      .update({ status: "OWNERSHIP_TRANSFERRED", buyer_wallet_address: buyer })
      .eq("id", listingRow.id);
    if (listingUpdateError) synced = false;
  } else {
    // No off-chain listing row to reconcile against (e.g. its own reconcile
    // step failed earlier) — on-chain state is still authoritative and
    // already verified above, but the settlement row needs a real
    // resale_listings.id FK, so it's skipped rather than inserting a
    // fabricated relationship.
    synced = false;
    console.warn(
      `[marketplace/purchase/reconcile] no resale_listings row found for product ${productId}; settlement not persisted`,
    );
  }

  const { error: ownershipError } = await supabase
    .from("ownership_records")
    .update({ owner_wallet_address: buyer, chain_tx_hash: txHash })
    .eq("product_id", productId);
  if (ownershipError) synced = false;

  if (listingRow) {
    const { error: settlementError } = await supabase.from("resale_settlements").insert({
      listing_id: listingRow.id,
      product_id: productId,
      buyer_wallet_address: buyer,
      seller_wallet_address: sellerWallet,
      amount_tinybar: Number(listing.priceTinybars),
      nft_contract_address: HEDERA_CONSUMER_NFT_ADDRESS,
      marketplace_contract_address: HEDERA_CONSUMER_MARKETPLACE_ADDRESS,
      status: "COMPLETED",
      chain_tx_hash: txHash,
      sync_status: "SYNCED",
      idempotency_key: idempotencyKey ?? null,
    });
    if (settlementError) synced = false;
  }

  console.log(
    JSON.stringify({
      event: synced ? "marketplace.backend.persisted" : "marketplace.sync_failed",
      source: "backend",
      productId,
      txHash,
      timestamp: new Date().toISOString(),
    }),
  );

  return json({ verified: true, synced });
}
