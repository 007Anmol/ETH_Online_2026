import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { normalizeTagUid, placeholderHash } from "@/lib/crypto/hash";
import { tapCmacIsValid } from "@/lib/nfc/tap-payload";
import type { NfcTapPayload, VerificationResult, VerifyProductResponse } from "@/lib/types";

/** Team 1 verify (database). Hedera consumeNonce will be called via `@verichain/hedera`. */

type VerifyInput = NfcTapPayload & {
  scanned_by?: string | null;
};

export type VerifyTapResult = VerifyProductResponse & {
  httpStatus: number;
};

async function recordAttempt(
  supabase: SupabaseClient<Database>,
  input: {
    tagId: string | null;
    productId: string | null;
    payload: NfcTapPayload;
    result: VerificationResult;
    failureReason: string | null;
    scannedBy: string | null;
  },
) {
  await supabase.from("verification_attempts").insert({
    tag_id: input.tagId,
    product_id: input.productId,
    raw_payload: input.payload,
    result: input.result,
    failure_reason: input.failureReason,
    scanned_by: input.scannedBy,
  });
}

export async function verifyTap(
  supabase: SupabaseClient<Database>,
  input: VerifyInput,
): Promise<VerifyTapResult> {
  const tagUid = normalizeTagUid(input.tag_uid);
  const nonce = input.nonce.trim();
  const cmac = input.cmac.trim().toLowerCase();
  const payload: NfcTapPayload = {
    tag_uid: tagUid,
    nonce,
    cmac,
  };
  const scannedBy = input.scanned_by ?? null;

  if (!tagUid || !nonce || !cmac) {
    await recordAttempt(supabase, {
      tagId: null,
      productId: null,
      payload,
      result: "INVALID",
      failureReason: "tag_uid, nonce, and cmac are required",
      scannedBy,
    });
    return {
      result: "INVALID",
      failure_reason: "tag_uid, nonce, and cmac are required",
      httpStatus: 400,
    };
  }

  const { data: tag, error: tagError } = await supabase
    .from("nfc_tags")
    .select("id, product_id, status")
    .eq("tag_uid", tagUid)
    .maybeSingle();

  if (tagError) {
    await recordAttempt(supabase, {
      tagId: null,
      productId: null,
      payload,
      result: "ERROR",
      failureReason: tagError.message,
      scannedBy,
    });
    return { result: "ERROR", failure_reason: tagError.message, httpStatus: 500 };
  }

  if (!tag || tag.status !== "BOUND" || !tag.product_id) {
    await recordAttempt(supabase, {
      tagId: tag?.id ?? null,
      productId: tag?.product_id ?? null,
      payload,
      result: "INVALID",
      failureReason: "Unknown or unbound tag",
      scannedBy,
    });
    return {
      result: "INVALID",
      failure_reason: "Unknown or unbound tag",
      httpStatus: 200,
    };
  }

  if (!tapCmacIsValid(payload)) {
    await recordAttempt(supabase, {
      tagId: tag.id,
      productId: tag.product_id,
      payload,
      result: "INVALID",
      failureReason: "CMAC check failed",
      scannedBy,
    });
    return {
      result: "INVALID",
      failure_reason: "CMAC check failed",
      httpStatus: 200,
    };
  }

  const nonceHash = placeholderHash(`${tagUid}:${nonce}`);
  const { data: existingNonce, error: nonceLookupError } = await supabase
    .from("verification_nonces")
    .select("id, consumed")
    .eq("nonce_hash", nonceHash)
    .maybeSingle();

  if (nonceLookupError) {
    await recordAttempt(supabase, {
      tagId: tag.id,
      productId: tag.product_id,
      payload,
      result: "ERROR",
      failureReason: nonceLookupError.message,
      scannedBy,
    });
    return {
      result: "ERROR",
      failure_reason: nonceLookupError.message,
      httpStatus: 500,
    };
  }

  if (existingNonce?.consumed) {
    await recordAttempt(supabase, {
      tagId: tag.id,
      productId: tag.product_id,
      payload,
      result: "DUPLICATE",
      failureReason: "Nonce already used",
      scannedBy,
    });
    const facts = await loadProductFacts(supabase, tag.product_id);
    return {
      result: "DUPLICATE",
      failure_reason: "Nonce already used",
      ...publicFacts(facts),
      httpStatus: 200,
    };
  }

  const now = new Date().toISOString();
  if (existingNonce) {
    const { error: consumeError } = await supabase
      .from("verification_nonces")
      .update({ consumed: true, consumed_at: now })
      .eq("id", existingNonce.id);
    if (consumeError) {
      await recordAttempt(supabase, {
        tagId: tag.id,
        productId: tag.product_id,
        payload,
        result: "ERROR",
        failureReason: consumeError.message,
        scannedBy,
      });
      return { result: "ERROR", failure_reason: consumeError.message, httpStatus: 500 };
    }
  } else {
    const { error: insertNonceError } = await supabase
      .from("verification_nonces")
      .insert({
        tag_id: tag.id,
        nonce_hash: nonceHash,
        consumed: true,
        consumed_at: now,
      });
    if (insertNonceError) {
      if (insertNonceError.code === "23505") {
        await recordAttempt(supabase, {
          tagId: tag.id,
          productId: tag.product_id,
          payload,
          result: "DUPLICATE",
          failureReason: "Nonce already used",
          scannedBy,
        });
        const raced = await loadProductFacts(supabase, tag.product_id);
        return {
          result: "DUPLICATE",
          failure_reason: "Nonce already used",
          ...publicFacts(raced),
          httpStatus: 200,
        };
      }
      await recordAttempt(supabase, {
        tagId: tag.id,
        productId: tag.product_id,
        payload,
        result: "ERROR",
        failureReason: insertNonceError.message,
        scannedBy,
      });
      return {
        result: "ERROR",
        failure_reason: insertNonceError.message,
        httpStatus: 500,
      };
    }
  }

  const facts = await loadProductFacts(supabase, tag.product_id);

  await supabase.from("product_events").insert({
    event_type: "NONCE_CONSUMED",
    product_id: tag.product_id,
    batch_id: facts.batch_id,
    tag_id: tag.id,
    payload: { tag_uid: tagUid, nonce_hash: nonceHash },
  });

  await recordAttempt(supabase, {
    tagId: tag.id,
    productId: tag.product_id,
    payload,
    result: "AUTHENTIC",
    failureReason: null,
    scannedBy,
  });

  return {
    result: "AUTHENTIC",
    ...publicFacts(facts),
    httpStatus: 200,
  };
}

function publicFacts(
  facts: Awaited<ReturnType<typeof loadProductFacts>>,
) {
  return {
    product_id: facts.product_id,
    product_code: facts.product_code,
    batch_code: facts.batch_code,
    product_name: facts.product_name,
    product_category: facts.product_category,
    manufacturing_date: facts.manufacturing_date,
    plant_id: facts.plant_id,
  };
}

async function loadProductFacts(
  supabase: SupabaseClient<Database>,
  productId: string,
) {
  const { data: product } = await supabase
    .from("products")
    .select("id, product_code, batch_id")
    .eq("id", productId)
    .maybeSingle();

  const { data: batch } = product
    ? await supabase
        .from("batches")
        .select("batch_code, product_name, product_category, manufacturing_date, plant_id")
        .eq("id", product.batch_id)
        .maybeSingle()
    : { data: null };

  return {
    product_id: product?.id,
    product_code: product?.product_code,
    batch_id: product?.batch_id ?? null,
    batch_code: batch?.batch_code,
    product_name: batch?.product_name,
    product_category: batch?.product_category,
    manufacturing_date: batch?.manufacturing_date ?? undefined,
    plant_id: batch?.plant_id,
  };
}
