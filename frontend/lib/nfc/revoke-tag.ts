import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { deriveOnChainId } from "@/lib/crypto/hash";
import { revokeTagOnChain } from "@verichain/hedera";

type RevokeInput = {
  tag_id: string;
  reason: string;
  manufacturerOrgId: string;
  performed_by?: string | null;
};

export type RevokeTagResult =
  | { ok: true; tag_id: string; status: "REVOKED" }
  | { ok: false; status: number; error: string };

export async function revokeTag(
  supabase: SupabaseClient<Database>,
  input: RevokeInput,
): Promise<RevokeTagResult> {
  const { tag_id, reason } = input;
  const manufacturerOrgId = input.manufacturerOrgId?.trim() ?? "";

  if (!tag_id) {
    return { ok: false, status: 400, error: "tag_id is required" };
  }
  if (!manufacturerOrgId) {
    return {
      ok: false,
      status: 403,
      error: "Manufacturer organization is required",
    };
  }

  // 1. Fetch tag and ensure it's BOUND
  const { data: tag, error: tagError } = await supabase
    .from("nfc_tags")
    .select("id, tag_uid, product_id, status")
    .eq("id", tag_id)
    .maybeSingle();

  if (tagError) {
    return { ok: false, status: 500, error: tagError.message };
  }
  if (!tag) {
    return { ok: false, status: 404, error: "Tag not found" };
  }
  if (!tag.product_id) {
    return { ok: false, status: 404, error: "Tag not found" };
  }

  const { data: boundProduct, error: boundProductError } = await supabase
    .from("products")
    .select("id, manufacturer_org_id")
    .eq("id", tag.product_id)
    .maybeSingle();

  if (boundProductError) {
    return { ok: false, status: 500, error: boundProductError.message };
  }
  if (!boundProduct || boundProduct.manufacturer_org_id !== manufacturerOrgId) {
    return { ok: false, status: 404, error: "Tag not found" };
  }
  if (tag.status === "REVOKED") {
    return { ok: false, status: 400, error: "Tag is already revoked" };
  }

  // 2. [HEDERA] Revoke Tag On-Chain
  const tagIdHash = deriveOnChainId(tag.tag_uid);
  let chainTxHash: string;
  try {
    const res = await revokeTagOnChain({ tagIdHash });
    chainTxHash = res.txHash;
  } catch (err: any) {
    console.error("[revokeTag] Hedera revokeTag failed:", err);
    return { ok: false, status: 500, error: err.message || "Failed to revoke tag on-chain" };
  }

  // 3. [SUPABASE] Update tag status
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("nfc_tags")
    .update({
      status: "REVOKED",
      revoked_at: now,
      revoked_reason: reason,
      chain_tx_hash: chainTxHash,
    })
    .eq("id", tag_id);

  if (updateError) {
    return { ok: false, status: 500, error: updateError.message };
  }

  // If bound to a product, log it in history and events
  if (tag.product_id) {
    await supabase.from("tag_binding_history").insert({
      tag_id,
      product_id: tag.product_id,
      action: "REVOKED",
      performed_by: input.performed_by ?? null,
      chain_tx_hash: chainTxHash,
    });

    const { data: product } = await supabase
      .from("products")
      .select("batch_id, product_code")
      .eq("id", tag.product_id)
      .single();

    if (product) {
      await supabase.from("product_events").insert({
        event_type: "TAG_REVOKED",
        product_id: tag.product_id,
        batch_id: product.batch_id,
        tag_id: tag_id,
        payload: { tag_uid: tag.tag_uid, reason, chain_tx_hash: chainTxHash },
        chain_tx_hash: chainTxHash,
      });
    }

    await supabase
      .from("products")
      .update({ status: "TAG_PENDING" })
      .eq("id", tag.product_id);
  }

  return { ok: true, tag_id, status: "REVOKED" };
}
