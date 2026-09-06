import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { json } from "@/lib/api/http";

// ─── GET /api/products ────────────────────────────────────────────────────────
// Returns product identities for the signed-in manufacturer org.
// Optional query param: ?batch_id=<uuid> to filter by batch.
// Optional query param: ?status=TAG_PENDING to filter by status.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.organizationId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batch_id");
  const status = searchParams.get("status");

  const db = createServiceClient();

  let query = db
    .from("products")
    .select("*")
    .eq("manufacturer_org_id", session.organizationId)
    .order("created_at", { ascending: false });

  if (batchId) query = query.eq("batch_id", batchId);
  if (status) query = query.eq("status", status as any);

  const { data: products, error } = await query;

  if (error) {
    console.error("[GET /api/products]", error);
    return json({ error: "Failed to fetch products" }, 500);
  }

  return json({ products: products ?? [] });
}
