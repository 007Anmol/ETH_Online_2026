import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  isTagUid,
  looksLikeUuid,
  normalizeTagUid,
  placeholderHash,
} from "@/lib/crypto/hash";
import type { ProductStatus, TagStatus } from "@/lib/types";
import { bindTagOnChain } from "@verichain/hedera";

/** Team 1 NFC bind (database). Hedera bindTag will be called via `@verichain/hedera`. */

type BindInput = {
  product_id: string;
  tag_uid: string;
  performed_by?: string | null;
};

export type BindTagResult =
  | {
      ok: true;
      product_id: string;
      product_code: string;
      tag_uid: string;
      tag_id: string;
      status: "TAG_BOUND";
    }
  | { ok: false; status: number; error: string };

const BINDABLE_STATUSES = new Set<ProductStatus>([
  "CREATED",
  "MINTED",
  "TAG_PENDING",
]);

type TagRow = {
  id: string;
  product_id: string | null;
  status: TagStatus;
  bound_at: string | null;
};

export async function bindTag(
  supabase: SupabaseClient<Database>,
  input: BindInput,
): Promise<BindTagResult> {
  const productKey = input.product_id.trim();
  const tagUid = normalizeTagUid(input.tag_uid);

  if (!productKey) {
    return { ok: false, status: 400, error: "product_id is required" };
  }
  if (!tagUid) {
    return { ok: false, status: 400, error: "tag_uid is required" };
  }
  if (!isTagUid(tagUid)) {
    return {
      ok: false,
      status: 400,
      error: "tag_uid must be 8–20 hex characters",
    };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, product_code, status, batch_id")
    .eq(looksLikeUuid(productKey) ? "id" : "product_code", productKey)
    .maybeSingle();

  if (productError) {
    return { ok: false, status: 500, error: productError.message };
  }
  if (!product) {
    return { ok: false, status: 404, error: "Product not found" };
  }

  const productId = product.id;

  const { data: existingOnProduct, error: existingOnProductError } =
    await supabase
      .from("nfc_tags")
      .select("id, tag_uid")
      .eq("product_id", productId)
      .eq("status", "BOUND")
      .maybeSingle();

  if (existingOnProductError) {
    return { ok: false, status: 500, error: existingOnProductError.message };
  }
  if (existingOnProduct) {
    return {
      ok: false,
      status: 409,
      error: `Product ${product.product_code} already has a bound tag`,
    };
  }

  if (
    product.status !== "TAG_BOUND" &&
    !BINDABLE_STATUSES.has(product.status)
  ) {
    return {
      ok: false,
      status: 409,
      error: `Product ${product.product_code} cannot be bound in status ${product.status}`,
    };
  }

  const { data: existingTag, error: existingTagError } = await supabase
    .from("nfc_tags")
    .select("id, product_id, status, bound_at")
    .eq("tag_uid", tagUid)
    .maybeSingle();

  if (existingTagError) {
    return { ok: false, status: 500, error: existingTagError.message };
  }
  if (existingTag?.status === "BOUND") {
    return {
      ok: false,
      status: 409,
      error: "This tag is already bound to a product",
    };
  }
  if (existingTag?.status === "REVOKED") {
    return {
      ok: false,
      status: 409,
      error: "This tag was revoked and cannot be bound again",
    };
  }

  const now = new Date().toISOString();
  const previousTag: TagRow | null = existingTag;
  let tagId = existingTag?.id;
  let inserted = false;

  if (existingTag) {
    const { error: updateError } = await supabase
      .from("nfc_tags")
      .update({
        product_id: productId,
        status: "BOUND",
        bound_at: now,
        revoked_at: null,
        revoked_reason: null,
      })
      .eq("id", existingTag.id);
    if (updateError) {
      return { ok: false, status: 500, error: updateError.message };
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from("nfc_tags")
      .insert({
        tag_uid: tagUid,
        tag_id_hash: placeholderHash(tagUid),
        product_id: productId,
        status: "BOUND",
        bound_at: now,
      })
      .select("id")
      .single();
    if (insertError || !created) {
      return {
        ok: false,
        status: 500,
        error: insertError?.message ?? "Could not create tag",
      };
    }
    tagId = created.id;
    inserted = true;
  }

  if (!tagId) {
    return { ok: false, status: 500, error: "Tag id missing after bind" };
  }

  // [HEDERA] Bind Tag On-Chain
  const productIdHash = placeholderHash(product.product_code);
  const tagIdHash = placeholderHash(tagUid);
  let chainTxHash: string;
  try {
    const res = await bindTagOnChain({ productIdHash, tagIdHash });
    chainTxHash = res.txHash;
  } catch (err: any) {
    console.error("[bindTag] Hedera bindTag failed:", err);
    // Rollback the tag insertion if it was newly created
    if (inserted) {
      await supabase.from("nfc_tags").delete().eq("id", tagId);
    }
    return { ok: false, status: 500, error: err.message || "Failed to bind tag on-chain" };
  }

  // Update nfc_tags with chain_tx_hash
  await supabase
    .from("nfc_tags")
    .update({ chain_tx_hash: chainTxHash })
    .eq("id", tagId);

  const previousStatus = product.status;
  const { error: productUpdateError } = await supabase
    .from("products")
    .update({ status: "TAG_BOUND" })
    .eq("id", productId);
  if (productUpdateError) {
    await rollbackBind(supabase, {
      tagId,
      inserted,
      previousTag,
      productId,
      previousStatus,
    });
    return { ok: false, status: 500, error: productUpdateError.message };
  }

  const { error: historyError } = await supabase
    .from("tag_binding_history")
    .insert({
      tag_id: tagId,
      product_id: productId,
      action: "BOUND",
      performed_by: input.performed_by ?? null,
    });
  if (historyError) {
    await rollbackBind(supabase, {
      tagId,
      inserted,
      previousTag,
      productId,
      previousStatus,
    });
    return { ok: false, status: 500, error: historyError.message };
  }

  const { error: eventError } = await supabase.from("product_events").insert({
    event_type: "TAG_BOUND",
    product_id: productId,
    batch_id: product.batch_id,
    tag_id: tagId,
    payload: { tag_uid: tagUid, product_code: product.product_code },
  });
  if (eventError) {
    await rollbackBind(supabase, {
      tagId,
      inserted,
      previousTag,
      productId,
      previousStatus,
    });
    return { ok: false, status: 500, error: eventError.message };
  }

  await supabase.from("manufacturing_operations").insert({
    operation_type: "BIND_TAG",
    product_id: productId,
    batch_id: product.batch_id,
    performed_by: input.performed_by ?? null,
    status: "SUCCESS",
  });

  return {
    ok: true,
    product_id: productId,
    product_code: product.product_code,
    tag_uid: tagUid,
    tag_id: tagId,
    status: "TAG_BOUND",
  };
}

async function rollbackBind(
  supabase: SupabaseClient<Database>,
  input: {
    tagId: string;
    inserted: boolean;
    previousTag: TagRow | null;
    productId: string;
    previousStatus: ProductStatus;
  },
) {
  await supabase
    .from("products")
    .update({ status: input.previousStatus })
    .eq("id", input.productId);
  await supabase
    .from("tag_binding_history")
    .delete()
    .eq("tag_id", input.tagId)
    .eq("product_id", input.productId)
    .eq("action", "BOUND");
  await supabase
    .from("product_events")
    .delete()
    .eq("tag_id", input.tagId)
    .eq("event_type", "TAG_BOUND");

  if (input.inserted) {
    await supabase.from("nfc_tags").delete().eq("id", input.tagId);
    return;
  }
  if (input.previousTag) {
    await supabase
      .from("nfc_tags")
      .update({
        product_id: input.previousTag.product_id,
        status: input.previousTag.status,
        bound_at: input.previousTag.bound_at,
      })
      .eq("id", input.previousTag.id);
  }
}
