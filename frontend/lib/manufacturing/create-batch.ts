import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { placeholderHash } from "@/lib/crypto/hash";
import {
  isProductCategory,
  PRODUCT_CATEGORIES,
  type Batch,
  type CreateBatchInput,
  type Product,
} from "@/lib/types";

type CreateBatchContext = {
  organizationId: string;
  profileId: string | null;
};

export type CreateBatchResult =
  | { ok: true; batch: Batch; products: Product[] }
  | { ok: false; status: number; error: string };

/**
 * Team 1 manufacturing write (database).
 * Hedera create-batch / mint-batch will be called from here later via `@verichain/hedera`.
 */
export async function createBatch(
  supabase: SupabaseClient<Database>,
  input: CreateBatchInput,
  context: CreateBatchContext,
): Promise<CreateBatchResult> {
  const product_name = input.product_name?.trim() ?? "";
  const batch_code = input.batch_code?.trim() ?? "";
  const plant_id = input.plant_id?.trim() ?? "";
  const { quantity, product_category } = input;

  if (!product_name) {
    return { ok: false, status: 400, error: "product_name is required" };
  }
  if (!batch_code) {
    return { ok: false, status: 400, error: "batch_code is required" };
  }
  if (!plant_id) {
    return { ok: false, status: 400, error: "plant_id is required" };
  }
  if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
    return { ok: false, status: 400, error: "quantity must be a positive integer" };
  }
  if (quantity > 100) {
    return { ok: false, status: 400, error: "quantity cannot exceed 100" };
  }
  if (!product_category || !isProductCategory(product_category)) {
    return {
      ok: false,
      status: 400,
      error: `product_category must be ${PRODUCT_CATEGORIES.join(", ")}`,
    };
  }

  const manufacturing_date = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("batches")
    .select("id")
    .eq("batch_code", batch_code)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      status: 409,
      error: `Batch code "${batch_code}" already exists`,
    };
  }

  const batchIdHash = placeholderHash(batch_code);

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .insert({
      batch_code,
      batch_id_hash: batchIdHash,
      manufacturer_org_id: context.organizationId,
      product_name,
      product_category,
      plant_id,
      manufacturing_date,
      quantity,
      minted_count: quantity,
      status: "MINTED",
      created_by: context.profileId,
    })
    .select()
    .single();

  if (batchError || !batch) {
    console.error("[createBatch] batch insert:", batchError);
    return { ok: false, status: 500, error: "Failed to create batch" };
  }

  const slug = batch_code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const productRows = Array.from({ length: quantity }, (_, i) => {
    const serial = String(i + 1).padStart(6, "0");
    const product_code = `VC-${slug}-${serial}`;
    const product_id_hash = placeholderHash(product_code);
    return {
      product_code,
      product_id_hash,
      batch_id: batch.id,
      serial_number: `SN-${batch_code}-${serial}`,
      manufacturer_org_id: context.organizationId,
      status: "TAG_PENDING" as const,
    };
  });

  const { data: products, error: productsError } = await supabase
    .from("products")
    .insert(productRows)
    .select();

  if (productsError || !products) {
    console.error("[createBatch] products insert:", productsError);
    await supabase.from("batches").delete().eq("id", batch.id);
    const uniqueClash =
      productsError?.code === "23505" ||
      /duplicate key|unique/i.test(productsError?.message ?? "");
    return {
      ok: false,
      status: uniqueClash ? 409 : 500,
      error: uniqueClash
        ? "This batch code produces product codes that already exist. Choose a more distinct batch code."
        : "Failed to create product identities",
    };
  }

  return {
    ok: true,
    batch: batch as Batch,
    products: products as Product[],
  };
}
