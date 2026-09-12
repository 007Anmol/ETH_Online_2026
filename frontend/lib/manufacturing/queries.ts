import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase";
import type { Batch, Product } from "@/lib/types";
import { deriveOnChainId } from "@/lib/crypto/hash";
import { fetchGraphProduct } from "@/lib/graphql";

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

export async function getManufacturerProduct(
  id: string,
  orgId: string,
): Promise<{ product: Product; batch: Batch; tagId: string | null; graph: Awaited<ReturnType<typeof fetchGraphProduct>> } | null> {
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

  let tagId = null;
  if (product.status === "TAG_BOUND") {
    const { data: tag } = await db
      .from("nfc_tags")
      .select("id")
      .eq("product_id", id)
      .eq("status", "BOUND")
      .maybeSingle();
    if (tag) tagId = tag.id;
  }

  const graph = await fetchGraphProduct(deriveOnChainId(product.product_code));

  return { 
    product: product as Product, 
    batch: batch as Batch, 
    tagId,
    graph,
  };
}
