import "server-only";

import { createServiceClient } from "@/lib/supabase";
import type {
  BatchStatus,
  ProductCategory,
  ProductEventType,
  TagStatus,
} from "@/lib/types";
import {
  fetchGraphBatch,
  fetchGraphBatches,
  fetchGraphDashboardRows,
  type GraphBatch,
} from "@/lib/graphql";

export function graphId(id: string): string {
  return id.trim().toLowerCase();
}

function uniqueGraphIds(hashes: string[]): string[] {
  return [...new Set(hashes.map(graphId).filter(Boolean))];
}

function graphCount(value: string, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid Graph ${field}: ${value}`);
  }
  return n;
}

/** Map contract/Graph names onto existing shared enums. Do not add new labels. */
export function graphBatchStatus(status: string): BatchStatus {
  if (status === "Created" || status === "CREATED") return "CREATED";
  if (status === "Minted" || status === "MINTED") return "MINTED";
  throw new Error(`Unknown Graph batch status: ${status}`);
}

export function graphTagStatus(status: string): TagStatus {
  if (status === "Bound" || status === "BOUND") return "BOUND";
  if (status === "Revoked" || status === "REVOKED") return "REVOKED";
  throw new Error(`Unknown Graph tag status: ${status}`);
}

export function graphEventType(type: string): ProductEventType {
  if (type === "BatchCreated" || type === "BATCH_CREATED") return "BATCH_CREATED";
  if (type === "BatchMinted" || type === "BATCH_MINTED") return "BATCH_MINTED";
  if (type === "TagBound" || type === "TAG_BOUND") return "TAG_BOUND";
  if (type === "TagRevoked" || type === "TAG_REVOKED") return "TAG_REVOKED";
  if (type === "NonceConsumed" || type === "NONCE_CONSUMED") return "NONCE_CONSUMED";
  throw new Error(`Unknown Graph event type: ${type}`);
}

export type BatchLabels = {
  batch_code: string;
  product_name: string;
  plant_id: string;
  product_category: ProductCategory;
};

export type ProductLabels = {
  product_code: string;
};

export type TagLabels = {
  tag_uid: string;
};

export type DashboardCounts = {
  batches: number;
  products: number;
  bound: number;
};

export function dashboardCountsFromGraph(
  batches: Array<{ mintedCount: string }>,
  boundTagCount: number,
): DashboardCounts {
  let products = 0;
  for (const batch of batches) {
    products += graphCount(batch.mintedCount, "mintedCount");
  }
  return {
    batches: batches.length,
    products,
    bound: boundTagCount,
  };
}

export async function getGraphDashboardCounts(): Promise<DashboardCounts> {
  const rows = await fetchGraphDashboardRows();
  return dashboardCountsFromGraph(rows.batches, rows.boundTags.length);
}

export type LabeledBatch = {
  id: string;
  batch_code: string | null;
  product_name: string | null;
  plant_id: string | null;
  product_category: ProductCategory | null;
  quantity: number;
  mintedCount: number;
  status: BatchStatus;
  createdTx: string;
  mintedTx: string | null;
  createdAt: number;
};

export async function batchLabelsByHash(
  hashes: string[],
): Promise<Map<string, BatchLabels>> {
  const ids = uniqueGraphIds(hashes);
  const labels = new Map<string, BatchLabels>();
  if (ids.length === 0) return labels;

  const { data, error } = await createServiceClient()
    .from("batches")
    .select("batch_id_hash, batch_code, product_name, plant_id, product_category")
    .in("batch_id_hash", ids);
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    labels.set(graphId(row.batch_id_hash), {
      batch_code: row.batch_code,
      product_name: row.product_name,
      plant_id: row.plant_id,
      product_category: row.product_category,
    });
  }
  return labels;
}

export async function productLabelsByHash(
  hashes: string[],
): Promise<Map<string, ProductLabels>> {
  const ids = uniqueGraphIds(hashes);
  const labels = new Map<string, ProductLabels>();
  if (ids.length === 0) return labels;

  const { data, error } = await createServiceClient()
    .from("products")
    .select("product_id_hash, product_code")
    .in("product_id_hash", ids);
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    labels.set(graphId(row.product_id_hash), {
      product_code: row.product_code,
    });
  }
  return labels;
}

export async function tagLabelsByHash(
  hashes: string[],
): Promise<Map<string, TagLabels>> {
  const ids = uniqueGraphIds(hashes);
  const labels = new Map<string, TagLabels>();
  if (ids.length === 0) return labels;

  const { data, error } = await createServiceClient()
    .from("nfc_tags")
    .select("tag_id_hash, tag_uid")
    .in("tag_id_hash", ids);
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    labels.set(graphId(row.tag_id_hash), { tag_uid: row.tag_uid });
  }
  return labels;
}

export function labelGraphBatch(
  batch: GraphBatch,
  labels: BatchLabels | undefined,
): LabeledBatch {
  return {
    id: graphId(batch.id),
    batch_code: labels?.batch_code ?? null,
    product_name: labels?.product_name ?? null,
    plant_id: labels?.plant_id ?? null,
    product_category: labels?.product_category ?? null,
    quantity: graphCount(batch.quantity, "quantity"),
    mintedCount: graphCount(batch.mintedCount, "mintedCount"),
    status: graphBatchStatus(batch.status),
    createdTx: batch.createdTx,
    mintedTx: batch.mintedTx,
    createdAt: graphCount(batch.createdAt, "createdAt"),
  };
}

export async function labeledGraphBatches(
  first = 10,
): Promise<LabeledBatch[]> {
  const batches = await fetchGraphBatches(first);
  const labels = await batchLabelsByHash(batches.map((b) => b.id));
  return batches.map((batch) =>
    labelGraphBatch(batch, labels.get(graphId(batch.id))),
  );
}

export async function labeledGraphBatch(
  id: string,
): Promise<LabeledBatch | null> {
  const batch = await fetchGraphBatch(id);
  if (!batch) return null;
  const labels = await batchLabelsByHash([batch.id]);
  return labelGraphBatch(batch, labels.get(graphId(batch.id)));
}
