import { getConsumerNftOwner } from "@verichain/hedera";
import { json, readJson } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

type ReconcileBody = {
  transferId?: string;
  productId?: string;
  productIdHash?: `0x${string}`;
  txHash?: `0x${string}`;
  toWalletAddress?: string;
};

/**
 * Real reconciliation for a direct NFT transfer. Hedera is authoritative:
 * this independently reads `ownerOf(productIdHash)` — it never trusts the
 * client's claim that the transfer succeeded. Only after that on-chain read
 * confirms the new owner does it update `ownership_records`.
 *
 * Per CONSUMER_BACKEND_PLAN.md's "Architecture correction": if the on-chain
 * read confirms the transfer but the Supabase write fails, this still
 * reports `verified: true` with `synced: false` — the frontend must not
 * turn that into "transfer failed". A CONFIRMED-but-unsynced write is a
 * legitimate state to recover from later, not an error to show the user.
 */
export async function POST(request: Request) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);

  const parsed = await readJson<ReconcileBody>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const { transferId, productId, productIdHash, txHash, toWalletAddress } = parsed.body;

  if (!productId || !productIdHash || !txHash || !toWalletAddress) {
    return json(
      { error: "productId, productIdHash, txHash, and toWalletAddress are required" },
      400,
    );
  }

  const supabase = createServiceClient();

  if (transferId) {
    await supabase
      .from("ownership_transfers")
      .update({ status: "CONFIRMING", chain_tx_hash: txHash })
      .eq("id", transferId);
  }

  console.log(
    JSON.stringify({
      event: "ownership.transfer.backend.sync.started",
      source: "backend",
      productId,
      txHash,
      timestamp: new Date().toISOString(),
    }),
  );

  let onChainOwner: string | null;
  try {
    onChainOwner = await getConsumerNftOwner(productIdHash);
  } catch (error) {
    console.error("[consumer/transfers/reconcile] on-chain read failed", error);
    return json({ error: "Could not read on-chain ownership" }, 502);
  }

  const verified = onChainOwner?.toLowerCase() === toWalletAddress.toLowerCase();

  if (!verified) {
    console.log(
      JSON.stringify({
        event: "ownership.transfer.ownership_verification_failed",
        source: "backend",
        productId,
        txHash,
        expected: toWalletAddress.toLowerCase(),
        onChainOwner,
        timestamp: new Date().toISOString(),
      }),
    );
    if (transferId) {
      await supabase.from("ownership_transfers").update({ status: "FAILED" }).eq("id", transferId);
    }
    return json({ verified: false, synced: false });
  }

  console.log(
    JSON.stringify({
      event: "ownership.transfer.ownership.verified",
      source: "blockchain",
      productId,
      txHash,
      newOwner: onChainOwner,
      timestamp: new Date().toISOString(),
    }),
  );

  const { error: updateError } = await supabase
    .from("ownership_records")
    .update({
      owner_wallet_address: toWalletAddress.toLowerCase(),
      chain_tx_hash: txHash,
    })
    .eq("product_id", productId);

  if (updateError) {
    console.error("[consumer/transfers/reconcile] Supabase sync failed", updateError);
    console.log(
      JSON.stringify({
        event: "ownership.transfer.sync_failed",
        source: "backend",
        productId,
        txHash,
        timestamp: new Date().toISOString(),
      }),
    );
    if (transferId) {
      await supabase
        .from("ownership_transfers")
        .update({ status: "CONFIRMED", sync_status: "SYNC_FAILED", chain_tx_hash: txHash })
        .eq("id", transferId);
    }
    // Blockchain is confirmed regardless — do not report this as a transfer
    // failure. The caller should show "confirmed on Hedera, syncing".
    return json({ verified: true, synced: false });
  }

  if (transferId) {
    await supabase
      .from("ownership_transfers")
      .update({ status: "CONFIRMED", sync_status: "SYNCED", chain_tx_hash: txHash })
      .eq("id", transferId);
  }

  console.log(
    JSON.stringify({
      event: "ownership.transfer.backend.persisted",
      source: "backend",
      productId,
      txHash,
      timestamp: new Date().toISOString(),
    }),
  );

  return json({ verified: true, synced: true });
}
