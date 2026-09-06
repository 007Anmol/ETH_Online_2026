import "server-only";

import { createServiceClient } from "@/lib/supabase";
import {
  isPracticeProduct,
  isSharedDemoProduct,
  type BindableProduct,
} from "@/lib/nfc/product-summary";

export type { BindableProduct };

export async function listProductsForBind(options?: {
  manufacturerOrgId?: string | null;
}): Promise<BindableProduct[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("products")
    .select("id, product_code, serial_number, status, batch_id")
    .order("product_code");
  if (options?.manufacturerOrgId) {
    query = query.eq("manufacturer_org_id", options.manufacturerOrgId);
  }

  const { data: products, error } = await query;

  if (error || !products) {
    throw new Error(error?.message ?? "Could not load products");
  }

  const { data: batches, error: batchError } = await supabase
    .from("batches")
    .select("id, batch_code");
  if (batchError) {
    throw new Error(batchError.message);
  }
  const batchCode = new Map(
    (batches ?? []).map((batch) => [batch.id, batch.batch_code]),
  );

  const { data: tags, error: tagError } = await supabase
    .from("nfc_tags")
    .select("product_id, tag_uid")
    .eq("status", "BOUND");

  if (tagError) {
    throw new Error(tagError.message);
  }

  const tagByProduct = new Map(
    (tags ?? [])
      .filter((tag) => tag.product_id)
      .map((tag) => [tag.product_id as string, tag.tag_uid]),
  );

  return products
    .map((product) => {
      const batch_code = batchCode.get(product.batch_id) ?? null;
      return {
        id: product.id,
        product_code: product.product_code,
        serial_number: product.serial_number,
        status: product.status,
        batch_code,
        bound_tag_uid: tagByProduct.get(product.id) ?? null,
        is_practice: isPracticeProduct({
          product_code: product.product_code,
          batch_code,
        }),
        is_shared_demo: isSharedDemoProduct({
          product_code: product.product_code,
          batch_code,
        }),
      };
    })
    .sort((a, b) => {
      const rank = (product: BindableProduct) =>
        product.is_shared_demo ? 0 : product.is_practice ? 2 : 1;
      const byRank = rank(a) - rank(b);
      return byRank !== 0 ? byRank : a.product_code.localeCompare(b.product_code);
    });
}
