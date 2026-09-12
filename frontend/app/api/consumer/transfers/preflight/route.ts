import { json, readJson } from "@/lib/api/http";
import { requireConsumer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";

type PreflightBody = {
  productId?: string;
  toWalletAddress?: string;
  idempotencyKey?: string;
};

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

/**
 * Real preflight authorization for a direct NFT transfer — everything here
 * is checked server-side against Supabase before the browser is allowed to
 * even request a wallet signature. Never trusts a client-supplied owner.
 */
export async function POST(request: Request) {
  const authorization = await requireConsumer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);
  const { session } = authorization;

  const parsed = await readJson<PreflightBody>(request);
  if (!parsed.ok) return json({ error: "Invalid JSON body" }, 400);
  const { productId, toWalletAddress, idempotencyKey } = parsed.body;

  if (!productId || !toWalletAddress) {
    return json({ error: "productId and toWalletAddress are required" }, 400);
  }
  if (!ADDRESS_PATTERN.test(toWalletAddress)) {
    return json({ error: "toWalletAddress is not a valid EVM address" }, 400);
  }

  const normalizedTo = toWalletAddress.toLowerCase();
  const fromWallet = session.walletAddress.toLowerCase();

  if (normalizedTo === fromWallet) {
    return json({ error: "Cannot transfer a product to yourself" }, 400);
  }

  const supabase = createServiceClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, product_id_hash, status")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    console.error("[consumer/transfers/preflight] product lookup failed", productError);
    return json({ error: "Could not load product" }, 500);
  }
  if (!product) return json({ error: "Product not found" }, 404);

  if (product.status === "SUSPECT_COUNTERFEIT" || product.status === "REVOKED") {
    return json({ error: "This product has been flagged and cannot be transferred" }, 409);
  }

  const { data: ownership, error: ownershipError } = await supabase
    .from("ownership_records")
    .select("owner_wallet_address")
    .eq("product_id", productId)
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ownershipError) {
    console.error("[consumer/transfers/preflight] ownership lookup failed", ownershipError);
    return json({ error: "Could not load ownership record" }, 500);
  }
  if (!ownership) {
    return json({ error: "This product has no recorded owner" }, 404);
  }
  if (ownership.owner_wallet_address.toLowerCase() !== fromWallet) {
    return json({ error: "You do not currently own this product" }, 403);
  }

  console.log(
    JSON.stringify({
      event: "ownership.transfer.preflight.validated",
      source: "backend",
      productId,
      fromWallet,
      toWallet: normalizedTo,
      timestamp: new Date().toISOString(),
    }),
  );

  // Idempotent operation record: retrying the same idempotencyKey returns
  // the existing PENDING_SIGNATURE row instead of creating a duplicate.
  let transferId: string;
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("ownership_transfers")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing) {
      transferId = existing.id;
    } else {
      const { data: created, error: insertError } = await supabase
        .from("ownership_transfers")
        .insert({
          product_id: productId,
          from_wallet_address: fromWallet,
          to_wallet_address: normalizedTo,
          status: "PENDING_SIGNATURE",
          idempotency_key: idempotencyKey,
        })
        .select("id")
        .single();
      if (insertError || !created) {
        console.error("[consumer/transfers/preflight] could not create operation record", insertError);
        return json({ error: "Could not start transfer" }, 500);
      }
      transferId = created.id;
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from("ownership_transfers")
      .insert({
        product_id: productId,
        from_wallet_address: fromWallet,
        to_wallet_address: normalizedTo,
        status: "PENDING_SIGNATURE",
      })
      .select("id")
      .single();
    if (insertError || !created) {
      console.error("[consumer/transfers/preflight] could not create operation record", insertError);
      return json({ error: "Could not start transfer" }, 500);
    }
    transferId = created.id;
  }

  return json({
    ok: true,
    transferId,
    productIdHash: product.product_id_hash,
    fromWalletAddress: ownership.owner_wallet_address,
  });
}
