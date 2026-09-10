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

type OperationRow = { id: string; operation_type: string };
type OperationMetadata =
  Database["public"]["Tables"]["manufacturing_operations"]["Insert"]["metadata"];

function chainErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function chainAlreadyHas(err: unknown, marker: string): boolean {
  return chainErrorMessage(err).includes(marker);
}

/**
 * Create a manufacturing batch, mint product identities on Hedera, then mirror them in Supabase.
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
      error: `Batch code "${batch_code}" already exists in database`,
    };
  }

  const batchIdHash = deriveOnChainId(batch_code);
  const slug = batch_code.replace(/[^A-Z0-9]/gi, "").toUpperCase();

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

  let createTxHash: string | null = null;
  try {
    const res = await createBatchOnChain({ batchIdHash, quantity });
    createTxHash = res.txHash;
  } catch (err: unknown) {
    if (!chainAlreadyHas(err, "BatchAlreadyExists")) {
      console.error("[createBatch] Hedera createBatch failed:", err);
      return {
        ok: false,
        status: 500,
        error: chainErrorMessage(err) || "Failed to create batch on-chain",
      };
    }
    console.warn(
      "[createBatch] batch already exists on Hedera; continuing so the database can catch up",
      batch_code,
    );
  }

  let mintTxHash: string | null = null;
  try {
    const res = await mintBatchOnChain({ batchIdHash, productIdHashes });
    mintTxHash = res.txHash;
  } catch (err: unknown) {
    if (
      !chainAlreadyHas(err, "ProductAlreadyMinted") &&
      !chainAlreadyHas(err, "OverMint")
    ) {
      console.error("[createBatch] Hedera mintBatch failed:", err);
      return {
        ok: false,
        status: 500,
        error: chainErrorMessage(err) || "Failed to mint batch on-chain",
      };
    }
    console.warn(
      "[createBatch] products already minted on Hedera; continuing so the database can catch up",
      batch_code,
    );
  }

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
    await recordOperations(supabase, {
      context,
      createTxHash,
      mintTxHash,
      status: "PENDING",
      metadata: reconciliationPayload({
        batch_code,
        batchIdHash,
        product_name,
        product_category,
        plant_id,
        manufacturing_date,
        quantity,
        organizationId: context.organizationId,
        profileId: context.profileId,
        productRows,
        createTxHash,
        mintTxHash,
      }),
      errorMessage: batchError?.message ?? "Batch insert failed",
    });
    return {
      ok: false,
      status: 500,
      error: "Saved on chain, but failed to save batch to DB. Please refresh.",
    };
  }

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
    await recordOperations(supabase, {
      context,
      createTxHash,
      mintTxHash,
      batchId: batch.id,
      status: "PENDING",
      metadata: reconciliationPayload({
        batch_code,
        batchIdHash,
        product_name,
        product_category,
        plant_id,
        manufacturing_date,
        quantity,
        organizationId: context.organizationId,
        profileId: context.profileId,
        productRows,
        createTxHash,
        mintTxHash,
      }),
      errorMessage: productsError?.message ?? "Product insert failed",
    });
    return {
      ok: false,
      status: 500,
      error: "Saved on chain, but failed to create product identities in DB. Please refresh.",
    };
  }

  await recordOperations(supabase, {
    context,
    createTxHash,
    mintTxHash,
    batchId: batch.id,
    status: "SUCCESS",
    metadata: reconciliationPayload({
      batch_code,
      batchIdHash,
      product_name,
      product_category,
      plant_id,
      manufacturing_date,
      quantity,
      organizationId: context.organizationId,
      profileId: context.profileId,
      productRows,
      createTxHash,
      mintTxHash,
    }),
  });

  return {
    ok: true,
    batch: batch as Batch,
    products: products as Product[],
  };
}

function reconciliationPayload(input: {
  batch_code: string;
  batchIdHash: string;
  product_name: string;
  product_category: string;
  plant_id: string;
  manufacturing_date: string;
  quantity: number;
  organizationId: string;
  profileId: string | null;
  productRows: Array<{
    product_code: string;
    product_id_hash: string;
    serial_number: string;
  }>;
  createTxHash: string | null;
  mintTxHash: string | null;
}): NonNullable<OperationMetadata> {
  return {
    batch: {
      batch_code: input.batch_code,
      batch_id_hash: input.batchIdHash,
      product_name: input.product_name,
      product_category: input.product_category,
      plant_id: input.plant_id,
      manufacturing_date: input.manufacturing_date,
      quantity: input.quantity,
      minted_count: input.quantity,
      status: "MINTED",
      manufacturer_org_id: input.organizationId,
      created_by: input.profileId,
    },
    products: input.productRows.map((product) => ({
      ...product,
      batch_id: null,
      manufacturer_org_id: input.organizationId,
      status: "TAG_PENDING",
    })),
    createTxHash: input.createTxHash,
    mintTxHash: input.mintTxHash,
  };
}

async function recordOperations(
  supabase: SupabaseClient<Database>,
  input: {
    context: CreateBatchContext;
    createTxHash: string | null;
    mintTxHash: string | null;
    batchId?: string;
    status: "PENDING" | "SUCCESS";
    metadata: NonNullable<OperationMetadata>;
    errorMessage?: string;
  },
): Promise<OperationRow[]> {
  const baseRows = [
    {
      operation_type: "CREATE_BATCH" as const,
      performed_by: input.context.profileId,
      chain_tx_hash: input.createTxHash,
      batch_id: input.batchId ?? null,
      status: input.status,
      error_message: input.errorMessage ?? null,
    },
    {
      operation_type: "MINT_BATCH" as const,
      performed_by: input.context.profileId,
      chain_tx_hash: input.mintTxHash,
      batch_id: input.batchId ?? null,
      status: input.status,
      error_message: input.errorMessage ?? null,
    },
  ];

  const withMetadata = await supabase
    .from("manufacturing_operations")
    .insert(baseRows.map((row) => ({ ...row, metadata: input.metadata })))
    .select("id, operation_type");

  if (!withMetadata.error && withMetadata.data?.length === 2) {
    return withMetadata.data;
  }

  console.error("[createBatch] reconciliation ledger insert:", withMetadata.error);

  const withoutMetadata = await supabase
    .from("manufacturing_operations")
    .insert(baseRows)
    .select("id, operation_type");

  if (withoutMetadata.error || !withoutMetadata.data || withoutMetadata.data.length !== 2) {
    console.error(
      "[createBatch] reconciliation ledger insert without metadata:",
      withoutMetadata.error,
    );
    return [];
  }

  return withoutMetadata.data;
}
