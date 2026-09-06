import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { json } from "@/lib/api/http";
import { placeholderHash } from "@/lib/crypto/hash";
import { isProductCategory, PRODUCT_CATEGORIES, type CreateBatchInput } from "@/lib/types";

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

  const product_name = body.product_name?.trim() ?? "";
  const batch_code = body.batch_code?.trim() ?? "";
  const plant_id = body.plant_id?.trim() ?? "";
  const { quantity, product_category } = body;

  if (!product_name) return json({ error: "product_name is required" }, 400);
  if (!batch_code) return json({ error: "batch_code is required" }, 400);
  if (!plant_id) return json({ error: "plant_id is required" }, 400);
  if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
    return json({ error: "quantity must be a positive integer" }, 400);
  }
  if (quantity > 100) {
    return json({ error: "quantity cannot exceed 100" }, 400);
  }
  if (!product_category || !isProductCategory(product_category)) {
    return json(
      { error: `product_category must be ${PRODUCT_CATEGORIES.join(", ")}` },
      400,
    );
  }

  const manufacturing_date = new Date().toISOString().slice(0, 10);

  const db = createServiceClient();

  const { data: existing } = await db
    .from("batches")
    .select("id")
    .eq("batch_code", batch_code)
    .maybeSingle();

  if (existing) {
    return json({ error: `Batch code "${batch_code}" already exists` }, 409);
  }

  const batchIdHash = placeholderHash(batch_code);

  const { data: batch, error: batchError } = await db
    .from("batches")
    .insert({
      batch_code,
      batch_id_hash: batchIdHash,
      manufacturer_org_id: session.organizationId,
      product_name,
      product_category,
      plant_id,
      manufacturing_date,
      quantity,
      minted_count: quantity,
      status: "MINTED",
      created_by: session.profileId,
    })
    .select()
    .single();

  if (batchError || !batch) {
    console.error("[POST /api/batches] batch insert:", batchError);
    return json({ error: "Failed to create batch" }, 500);
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
    await db.from("batches").delete().eq("id", batch.id);
    const uniqueClash =
      productsError?.code === "23505" ||
      /duplicate key|unique/i.test(productsError?.message ?? "");
    return json(
      {
        error: uniqueClash
          ? "This batch code produces product codes that already exist. Choose a more distinct batch code."
          : "Failed to create product identities",
      },
      uniqueClash ? 409 : 500,
    );
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
