import { json } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

/**
 * Real activity feed for the signed-in wallet — every ownership_transfers
 * and resale_settlements row it appears in as either party. Read-only,
 * backed entirely by rows the reconcile routes already wrote after
 * independently verifying on-chain state; this never re-derives status,
 * it just surfaces what reconciliation already recorded.
 */
export async function GET() {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const wallet = authorization.session.walletAddress.toLowerCase();

  const supabase = createServiceClient();

  const [transfersRes, settlementsRes] = await Promise.all([
    supabase
      .from("ownership_transfers")
      .select("id, product_id, from_wallet_address, to_wallet_address, status, sync_status, chain_tx_hash, created_at")
      .or(`from_wallet_address.eq.${wallet},to_wallet_address.eq.${wallet}`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("resale_settlements")
      .select("id, product_id, buyer_wallet_address, seller_wallet_address, amount_tinybar, status, sync_status, chain_tx_hash, created_at")
      .or(`buyer_wallet_address.eq.${wallet},seller_wallet_address.eq.${wallet}`)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (transfersRes.error) {
    console.error("[consumer/activity] transfers query failed", transfersRes.error);
    return json({ error: "Could not load transfer activity" }, 500);
  }
  if (settlementsRes.error) {
    console.error("[consumer/activity] settlements query failed", settlementsRes.error);
    return json({ error: "Could not load resale activity" }, 500);
  }

  const productIds = [
    ...new Set([
      ...transfersRes.data.map((t) => t.product_id),
      ...settlementsRes.data.map((s) => s.product_id),
    ]),
  ];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, product_code").in("id", productIds)
    : { data: [] };
  const productCodeById = new Map((products ?? []).map((p) => [p.id, p.product_code]));

  const transfers = transfersRes.data.map((t) => ({
    kind: "TRANSFER" as const,
    id: t.id,
    productId: t.product_id,
    productCode: productCodeById.get(t.product_id) ?? t.product_id,
    fromWallet: t.from_wallet_address,
    toWallet: t.to_wallet_address,
    role: t.from_wallet_address.toLowerCase() === wallet ? ("SENDER" as const) : ("RECEIVER" as const),
    status: t.status,
    syncStatus: t.sync_status,
    chainTxHash: t.chain_tx_hash,
    createdAt: t.created_at,
  }));

  const settlements = settlementsRes.data.map((s) => ({
    kind: "RESALE" as const,
    id: s.id,
    productId: s.product_id,
    productCode: productCodeById.get(s.product_id) ?? s.product_id,
    fromWallet: s.seller_wallet_address,
    toWallet: s.buyer_wallet_address,
    role: s.seller_wallet_address.toLowerCase() === wallet ? ("SELLER" as const) : ("BUYER" as const),
    amountTinybar: s.amount_tinybar,
    status: s.status,
    syncStatus: s.sync_status,
    chainTxHash: s.chain_tx_hash,
    createdAt: s.created_at,
  }));

  const activity = [...transfers, ...settlements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return json({ activity });
}
