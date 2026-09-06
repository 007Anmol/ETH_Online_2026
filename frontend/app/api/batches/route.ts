import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { json } from "@/lib/api/http";
import type { CreateBatchInput } from "@/lib/types";

// ─── POST /api/batches ────────────────────────────────────────────────────────
// Creates one batch row + N product rows (quantity = body.quantity).
// Status: batch → MINTED, products → TAG_PENDING.
// Rejects duplicate batch_code.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: CreateBatchInput;
  try {
    body = (await req.json()) as CreateBatchInput;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { product_name, batch_code, plant_id, manufacturing_date, expiry_date, quantity, product_category } = body;

  // Validate required fields
  if (!product_name?.trim()) return json({ error: "product_name is required" }, 400);
  if (!batch_code?.trim()) return json({ error: "batch_code is required" }, 400);
  if (!plant_id?.trim()) return json({ error: "plant_id is required" }, 400);
  if (!manufacturing_date?.trim()) return json({ error: "manufacturing_date is required" }, 400);
  if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) return json({ error: "quantity must be a positive integer" }, 400);

  const db = createServiceClient();

  // Reject duplicate batch_code
  const { data: existing } = await db
    .from("batches")
    .select("id")
    .eq("batch_code", batch_code.trim())
    .maybeSingle();

  if (existing) {
    return json({ error: `Batch code "${batch_code}" already exists` }, 409);
  }

  // Derive a deterministic batch_id_hash (simple hex encode for Phase 1 — keccak in Phase 2)
  const batchIdHash = Buffer.from(batch_code.trim()).toString("hex").padStart(64, "0").slice(0, 64);

  // Insert batch
  const { data: batch, error: batchError } = await db
    .from("batches")
    .insert({
      batch_code: batch_code.trim(),
      batch_id_hash: batchIdHash,
      manufacturer_org_id: session.organizationId,
      product_name: product_name.trim(),
      product_category: product_category?.trim() ?? null,
      plant_id: plant_id.trim(),
      manufacturing_date,
      expiry_date: expiry_date ?? null,
      quantity,
      minted_count: quantity,      // Phase 1: all minted instantly (no real chain call)
      status: "MINTED",
      created_by: session.profileId,
    })
    .select()
    .single();

  if (batchError || !batch) {
    console.error("[POST /api/batches] batch insert:", batchError);
    return json({ error: "Failed to create batch" }, 500);
  }

  // Insert N product rows
  const productRows = Array.from({ length: quantity }, (_, i) => {
    const serial = String(i + 1).padStart(6, "0");
    // product_code format: VC-<BATCHCODE_SLUG>-<SERIAL>
    const slug = batch_code.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8);
    const product_code = `VC-${slug}-${serial}`;
    const product_id_hash = Buffer.from(product_code).toString("hex").padStart(64, "0").slice(0, 64);
    return {
      product_code,
      product_id_hash,
      batch_id: batch.id,
      serial_number: `SN-${batch_code}-${serial}`,
      manufacturer_org_id: session.organizationId!,
      status: "TAG_PENDING" as const,
    };
  });

  const { data: products, error: productsError } = await db
    .from("products")
    .insert(productRows)
    .select();

  if (productsError || !products) {
    console.error("[POST /api/batches] products insert:", productsError);
    // Roll back batch if products fail
    await db.from("batches").delete().eq("id", batch.id);
    return json({ error: "Failed to create product identities" }, 500);
  }

  return json({ batch, products }, 201);
}

// ─── GET /api/batches ─────────────────────────────────────────────────────────
// Returns all batches for the signed-in manufacturer org, newest first.
export async function GET() {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const db = createServiceClient();

  const { data: batches, error } = await db
    .from("batches")
    .select("*")
    .eq("manufacturer_org_id", session.organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/batches]", error);
    return json({ error: "Failed to fetch batches" }, 500);
  }

  return json({ batches: batches ?? [] });
}
