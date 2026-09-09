import { json, readJson } from "@/lib/api/http";
import { requireManufacturer } from "@/lib/auth/authorization";
import { createServiceClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type ReconcileBody = { operationId?: string };

type ReconciliationMetadata = {
  batch: {
    batch_code: string;
    batch_id_hash: string;
    product_name: string;
    product_category: string;
    plant_id: string;
    manufacturing_date: string;
    quantity: number;
    minted_count: number;
    status: "MINTED";
    manufacturer_org_id: string;
    created_by: string | null;
  };
  products: Array<{
    product_code: string;
    product_id_hash: string;
    serial_number: string;
    manufacturer_org_id: string;
    status: "TAG_PENDING";
  }>;
  createTxHash: string;
  mintTxHash: string;
};

export async function POST(request: Request) {
  const authorization = await requireManufacturer();
  if (!authorization.ok) return json({ error: authorization.error }, authorization.status);

  const parsed = await readJson<ReconcileBody>(request);
  if (!parsed.ok || !parsed.body.operationId) {
    return json({ error: "operationId is required" }, 400);
  }

  const supabase = createServiceClient();
  const { data: operation, error: operationError } = await supabase
    .from("manufacturing_operations")
    .select("*")
    .eq("id", parsed.body.operationId)
    .eq("performed_by", authorization.session.profileId)
    .eq("status", "PENDING")
    .maybeSingle();

  if (operationError || !operation) {
    return json({ error: "Pending reconciliation operation not found" }, 404);
  }

  const metadata = operation.metadata as unknown as ReconciliationMetadata;
  if (!metadata?.batch || !metadata.products || metadata.batch.manufacturer_org_id !== authorization.session.organizationId) {
    return json({ error: "Reconciliation payload is invalid" }, 409);
  }

  let batchId = operation.batch_id;
  if (!batchId) {
    const { data: existingBatch } = await supabase
      .from("batches")
      .select("id")
      .eq("batch_code", metadata.batch.batch_code)
      .maybeSingle();

    if (existingBatch) {
      batchId = existingBatch.id;
    } else {
      const batchInsert: Database["public"]["Tables"]["batches"]["Insert"] = {
        ...metadata.batch,
        product_category: metadata.batch.product_category as Database["public"]["Tables"]["batches"]["Insert"]["product_category"],
      };
      const { data: insertedBatch, error: batchError } = await supabase
        .from("batches")
        .insert(batchInsert)
        .select("id")
        .single();

      if (batchError || !insertedBatch) {
        await supabase
          .from("manufacturing_operations")
          .update({ error_message: batchError?.message ?? "Reconciliation batch insert failed" })
          .eq("id", operation.id);
        return json({ error: "Could not reconcile batch state" }, 500);
      }
      batchId = insertedBatch.id;
    }
  }

  const products = metadata.products.map((product) => ({
    ...product,
    batch_id: batchId!,
    chain_tx_hash: metadata.mintTxHash,
  }));

  const { error: productsError } = await supabase
    .from("products")
    .upsert(products, { onConflict: "product_code" });

  if (productsError) {
    await supabase
      .from("manufacturing_operations")
      .update({ batch_id: batchId, error_message: productsError.message })
      .eq("id", operation.id);
    return json({ error: "Could not reconcile product state" }, 500);
  }

  await supabase
    .from("manufacturing_operations")
    .update({ batch_id: batchId, status: "SUCCESS", error_message: null })
    .eq("performed_by", authorization.session.profileId)
    .eq("status", "PENDING")
    .contains("metadata", { batch: { batch_code: metadata.batch.batch_code } });

  return json({ reconciled: true, batchId });
}