import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { normalizeTagUid } from "@/lib/crypto/hash";
import { signTapPayload } from "@/lib/nfc/tap-payload";
import type { NfcTapPayload } from "@/lib/types";

export type SimulateTapResult =
  | {
      ok: true;
      payload: NfcTapPayload;
      product_id: string;
      product_code: string;
    }
  | { ok: false; status: number; error: string };

export async function simulateTap(
  supabase: SupabaseClient<Database>,
  input: { tag_uid?: string; product_id?: string },
): Promise<SimulateTapResult> {
  const tagUid = input.tag_uid ? normalizeTagUid(input.tag_uid) : "";
  const productId = input.product_id?.trim() ?? "";

  if (!tagUid && !productId) {
    return {
      ok: false,
      status: 400,
      error: "tag_uid or product_id is required",
    };
  }

  let query = supabase
    .from("nfc_tags")
    .select("tag_uid, product_id, status")
    .eq("status", "BOUND");

  if (tagUid) query = query.eq("tag_uid", tagUid);
  if (productId) query = query.eq("product_id", productId);

  const { data: tag, error: tagError } = await query.maybeSingle();

  if (tagError) {
    return { ok: false, status: 500, error: tagError.message };
  }
  if (!tag?.product_id) {
    return {
      ok: false,
      status: 404,
      error: "No bound tag found for this product or UID",
    };
  }

  const { data: product } = await supabase
    .from("products")
    .select("product_code")
    .eq("id", tag.product_id)
    .maybeSingle();

  if (!product) {
    return {
      ok: false,
      status: 404,
      error: "Bound tag has no product record",
    };
  }

  const nonce = randomBytes(8).toString("hex");
  const payload = signTapPayload(tag.tag_uid, nonce);

  return {
    ok: true,
    payload,
    product_id: tag.product_id,
    product_code: product.product_code,
  };
}
