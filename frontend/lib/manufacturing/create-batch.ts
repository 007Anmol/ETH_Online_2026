import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { deriveOnChainId } from "@/lib/crypto/hash";
import {
  isProductCategory,
  PRODUCT_CATEGORIES,
  type Batch,
  type CreateBatchInput,
  type Product,
} from "@/lib/types";
import { createBatchOnChain, mintBatchOnChain } from "@verichain/hedera";

type CreateBatchContext = {
  organizationId: string;
  profileId: string | null;
};

export type CreateBatchResult =
  | { ok: true; batch: Batch; products: Product[] }
  | { ok: false; status: number; error: string };

/**
 * Team 1 manufacturing write (database).
 * Hedera create-batch / mint-batch are called from here via `@verichain/hedera`.
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

  // 1. Check if it already exists in DB to avoid unnecessary gas spend
  const { data: existing } = await supabase
    .from("batches")
    .select("id")
    .eq("batch_code", batch_code)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      status: 409,
      error: `Batch code "${batch_code}" already exists in database`,
    };
  }

  const batchIdHash = deriveOnChainId(batch_code);
  const slug = batch_code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  
  // Generate products to get their hashes for mintBatch
  const productRows = Array.from({ length: quantity }, (_, i) => {
    const serial = String(i + 1).padStart(6, "0");
    const product_code = `VC-${slug}-${serial}`;
    const product_id_hash = deriveOnChainId(product_code);
    return {
      product_code,
      product_id_hash,
      serial_number: `SN-${batch_code}-${serial}`,
    };
  });

  const productIdHashes = productRows.map((p) => p.product_id_hash);

  // 2. [HEDERA] Create Batch On-Chain
  let createTxHash: string;
  try {
    const res = await createBatchOnChain({ batchIdHash, quantity });
    createTxHash = res.txHash;
  } catch (err: any) {
    console.error("[createBatch] Hedera createBatch failed:", err);
    return { ok: false, status: 500, error: err.message || "Failed to create batch on-chain" };
  }

  // 3. [HEDERA] Mint Batch On-Chain
  let mintTxHash: string;
  try {
    const res = await mintBatchOnChain({ batchIdHash, productIdHashes });
    mintTxHash = res.txHash;
  } catch (err: any) {
    console.error("[createBatch] Hedera mintBatch failed:", err);
    return { ok: false, status: 500, error: err.message || "Failed to mint batch on-chain" };
  }

  const reconciliationMetadata = {
    batch: {
      batch_code,
      batch_id_hash: batchIdHash,
      product_name,
      product_category,
      plant_id,
      manufacturing_date,
      quantity,
      minted_count: quantity,
      status: "MINTED" as const,
      manufacturer_org_id: context.organizationId,
      created_by: context.profileId,
    },
    products: productRows.map((product) => ({
      ...product,
      batch_id: null,
      manufacturer_org_id: context.organizationId,
      status: "TAG_PENDING" as const,
    })),
    createTxHash,
    mintTxHash,
  };

  const { data: operations, error: operationError } = await supabase
    .from("manufacturing_operations")
    .insert([
      {
        operation_type: "CREATE_BATCH",
        performed_by: context.profileId,
        chain_tx_hash: createTxHash,
        status: "PENDING",
        metadata: reconciliationMetadata,
      },
      {
        operation_type: "MINT_BATCH",
        performed_by: context.profileId,
        chain_tx_hash: mintTxHash,
        status: "PENDING",
        metadata: reconciliationMetadata,
      },
    ])
    .select("id, operation_type");

  if (operationError || !operations || operations.length !== 2) {
    console.error("[createBatch] reconciliation ledger insert:", operationError);
    return {
      ok: false,
      status: 500,
      error: "Hedera succeeded, but the reconciliation record could not be saved.",
    };
  }

  const createOperationId = operations.find((operation) => operation.operation_type === "CREATE_BATCH")?.id;
  const mintOperationId = operations.find((operation) => operation.operation_type === "MINT_BATCH")?.id;

  // 4. [SUPABASE] Insert Batch
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
      chain_tx_hash: createTxHash,
      created_by: context.profileId,
    })
    .select()
    .single();

  if (batchError || !batch) {
    console.error("[createBatch] batch insert:", batchError);
    if (createOperationId) {
      await supabase
        .from("manufacturing_operations")
        .update({ error_message: batchError?.message ?? "Batch insert failed" })
        .eq("id", createOperationId);
    }
    return { ok: false, status: 500, error: "Saved on chain, but failed to save batch to DB. Please refresh." };
  }

  if (createOperationId) {
    await supabase
      .from("manufacturing_operations")
      .update({ batch_id: batch.id, status: "SUCCESS", error_message: null })
      .eq("id", createOperationId);
  }

  // 5. [SUPABASE] Insert Products
  const dbProductRows = productRows.map((p) => ({
    product_code: p.product_code,
    product_id_hash: p.product_id_hash,
    batch_id: batch.id,
    serial_number: p.serial_number,
    manufacturer_org_id: context.organizationId,
    status: "TAG_PENDING" as const,
    chain_tx_hash: mintTxHash,
  }));

  const { data: products, error: productsError } = await supabase
    .from("products")
    .insert(dbProductRows)
    .select();

  if (productsError || !products) {
    console.error("[createBatch] products insert:", productsError);
    if (mintOperationId) {
      await supabase
        .from("manufacturing_operations")
        .update({ batch_id: batch.id, error_message: productsError?.message ?? "Product insert failed" })
        .eq("id", mintOperationId);
    }
    return {
      ok: false,
      status: 500,
      error: "Saved on chain, but failed to create product identities in DB. Please refresh.",
    };
  }

  if (mintOperationId) {
    await supabase
      .from("manufacturing_operations")
      .update({ batch_id: batch.id, status: "SUCCESS", error_message: null })
      .eq("id", mintOperationId);
  }

  return {
    ok: true,
    batch: batch as Batch,
    products: products as Product[],
  };
}
