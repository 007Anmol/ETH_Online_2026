import "server-only";

import { deriveOnChainId, looksLikeUuid } from "@/lib/crypto/hash";
import { fetchGraphProduct, type GraphRegistryEvent } from "@/lib/graphql";
import { createServiceClient } from "@/lib/supabase";
import type { ProductCategory, ProductStatus, VerificationResult } from "@/lib/types";

export type PublicProductAttempt = {
  id: string;
  result: VerificationResult;
  created_at: string;
};

export type PublicProduct = {
  id: string;
  product_code: string;
  serial_number: string;
  status: ProductStatus;
  product_name: string;
  product_category: ProductCategory | null;
  batch_code: string;
  manufacturing_date: string;
  plant_id: string;
  bound_tag_uid: string | null;
  attempts: PublicProductAttempt[];
  graphEvents: GraphRegistryEvent[];
};

export async function getPublicProduct(
  idOrCode: string,
): Promise<PublicProduct | null> {
  const supabase = createServiceClient();
  const byId = looksLikeUuid(idOrCode);

  const { data: product, error } = await supabase
    .from("products")
    .select("id, product_code, serial_number, status, batch_id")
    .eq(byId ? "id" : "product_code", idOrCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!product) return null;

  const [{ data: batch }, { data: tag }, { data: attempts }] = await Promise.all([
    supabase
      .from("batches")
      .select("batch_code, product_name, product_category, manufacturing_date, plant_id")
      .eq("id", product.batch_id)
      .maybeSingle(),
    supabase
      .from("nfc_tags")
      .select("tag_uid")
      .eq("product_id", product.id)
      .eq("status", "BOUND")
      .maybeSingle(),
    supabase
      .from("verification_attempts")
      .select("id, result, created_at")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const graph = await fetchGraphProduct(deriveOnChainId(product.product_code));

  return {
    id: product.id,
    product_code: product.product_code,
    serial_number: product.serial_number,
    status: product.status,
    product_name: batch?.product_name ?? "Unknown product",
    product_category: batch?.product_category ?? null,
    batch_code: batch?.batch_code ?? "—",
    manufacturing_date: batch?.manufacturing_date ?? "",
    plant_id: batch?.plant_id ?? "—",
    bound_tag_uid: tag?.tag_uid ?? null,
    attempts: (attempts ?? []).map((attempt) => ({
      id: attempt.id,
      result: attempt.result,
      created_at: attempt.created_at,
    })),
    graphEvents: [...(graph?.batch?.events ?? []), ...(graph?.events ?? [])],
  };
}
