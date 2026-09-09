import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { normalizeTagUid, deriveOnChainId } from "@/lib/crypto/hash";
import { tapCmacIsValid } from "@/lib/nfc/tap-payload";
import type { NfcTapPayload, VerificationResult, VerifyProductResponse } from "@/lib/types";
import { consumeNonceOnChain } from "@verichain/hedera";

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

  const tagIdHash = deriveOnChainId(tagUid);
  const nonceHash = deriveOnChainId(`${tagUid}:${nonce}`);

  // [HEDERA] Consume nonce on-chain FIRST — blockchain is the authority for replay prevention.
  // If this reverts with NonceAlreadyConsumed, the DB is never touched.
  let chainTxHash: string;
  try {
    const res = await consumeNonceOnChain({ tagIdHash, nonceHash });
    chainTxHash = res.txHash;
  } catch (err: any) {
    const reason: string = err?.message ?? String(err);
    const isDuplicate =
      reason.toLowerCase().includes("noncealreadyconsumed") ||
      reason.toLowerCase().includes("nonce already consumed") ||
      reason.toLowerCase().includes("already consumed");

    if (isDuplicate) {
      await recordAttempt(supabase, {
        tagId: tag.id,
        productId: tag.product_id,
        payload,
        result: "DUPLICATE",
        failureReason: "Nonce already consumed on-chain",
        scannedBy,
      });
      const facts = await loadProductFacts(supabase, tag.product_id);
      return {
        result: "DUPLICATE",
        failure_reason: "Nonce already consumed on-chain",
        ...publicFacts(facts),
        httpStatus: 200,
      };
    }

    // Any other Hedera error
    await recordAttempt(supabase, {
      tagId: tag.id,
      productId: tag.product_id,
      payload,
      result: "ERROR",
      failureReason: reason,
      scannedBy,
    });
    return { result: "ERROR", failure_reason: reason, httpStatus: 500 };
  }

  // Hedera confirmed the nonce is fresh — now mirror it in Supabase.
  const now = new Date().toISOString();
  const { data: existingNonce } = await supabase
    .from("verification_nonces")
    .select("id, consumed")
    .eq("nonce_hash", nonceHash)
    .maybeSingle();

  if (existingNonce) {
    await supabase
      .from("verification_nonces")
      .update({ consumed: true, consumed_at: now })
      .eq("id", existingNonce.id);
  } else {
    await supabase.from("verification_nonces").insert({
      tag_id: tag.id,
      nonce_hash: nonceHash,
      consumed: true,
      consumed_at: now,
    });
  }

  const facts = await loadProductFacts(supabase, tag.product_id);

  await supabase.from("product_events").insert({
    event_type: "NONCE_CONSUMED",
    product_id: tag.product_id,
    batch_id: facts.batch_id,
    tag_id: tag.id,
    payload: { tag_uid: tagUid, nonce_hash: nonceHash, chain_tx_hash: chainTxHash },
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
    chain_tx_hash: chainTxHash,
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
