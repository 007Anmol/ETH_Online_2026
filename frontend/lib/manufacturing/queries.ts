import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase";
import type { Batch, Product } from "@/lib/types";

export function manufacturerBatchesQuery(
  supabase: SupabaseClient<Database>,
  orgId: string,
) {
  return supabase
    .from("batches")
    .select("*")
    .eq("manufacturer_org_id", orgId)
    .order("created_at", { ascending: false });
}

export function manufacturerProductsQuery(
  supabase: SupabaseClient<Database>,
  orgId: string,
  filters?: { batchId?: string | null; status?: string | null },
) {
  let query = supabase
    .from("products")
    .select("*")
    .eq("manufacturer_org_id", orgId)
    .order("created_at", { ascending: false });

  if (filters?.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters?.status) query = query.eq("status", filters.status as any);

  return query;
}

export async function getDashboardCounts(orgId: string) {
  const db = createServiceClient();

  const [batchRes, productRes, boundRes] = await Promise.all([
    db
      .from("batches")
      .select("id", { count: "exact", head: true })
      .eq("manufacturer_org_id", orgId),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("manufacturer_org_id", orgId),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("manufacturer_org_id", orgId)
      .eq("status", "TAG_BOUND"),
  ]);

  return {
    batches: batchRes.count ?? 0,
    products: productRes.count ?? 0,
    bound: boundRes.count ?? 0,
  };
}

export async function getManufacturerProduct(
  id: string,
  orgId: string,
): Promise<{ product: Product; batch: Batch } | null> {
  const db = createServiceClient();
  const { data: product } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("manufacturer_org_id", orgId)
    .maybeSingle();

  if (!product) return null;

  const { data: batch } = await db
    .from("batches")
    .select("*")
    .eq("id", (product as Product).batch_id)
    .maybeSingle();

  if (!batch) return null;
  return { product: product as Product, batch: batch as Batch };
}
