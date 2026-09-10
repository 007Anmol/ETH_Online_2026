import type { PaymentRecord } from "../../../packages/shared/types/payment";
import type { AnomalyStore, StoredAnomaly, StoredCheckpoint } from "./anomaly";
import type { PaymentStore } from "../../hedera/src/payments";

type ShipmentStatus = "CREATED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
type AnomalyStatus = "OPEN" | "RESOLVED" | "DISMISSED";
type ShipmentRow = { id: string; on_chain_shipment_id?: string | number | null; product_id: string; sender_org_id?: string | null; receiver_org_id?: string | null; status: ShipmentStatus; chain_tx_hash?: string | null; created_at?: string; updated_at?: string };
type CustodyRow = { id?: string; product_id: string; from_org_id?: string | null; to_org_id?: string | null; chain_tx_hash?: string | null; transferred_at?: string };
type CheckpointRow = { id?: string; request_id?: string | null; product_id: string; checkpoint_type: string; latitude: number; longitude: number; anomaly_decision?: "NORMAL" | "ANOMALY" | null; chain_tx_hash?: string | null; recorded_at: string; risk_score?: number | null };
type AnomalyRow = { id?: string; request_id?: string | null; product_id: string; risk_score: number; reason: string; explanation?: string | null; status: AnomalyStatus; chain_tx_hash?: string | null; resolved_at?: string | null; created_at?: string };
type EscrowRow = { id: string; on_chain_escrow_id?: string | number | null; product_id: string; buyer_org_id?: string | null; seller_org_id?: string | null; amount?: string | number | null; currency: string; status: "PENDING" | "LOCKED" | "RELEASED" | "FROZEN" | "REFUNDED"; chain_tx_hash?: string | null; created_at?: string; updated_at?: string };

type SupabaseConfig = { url: string; key: string };

function config(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return { url: url.replace(/\/$/, ""), key };
}

export async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${await response.text()}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export class SupabaseStore implements AnomalyStore, PaymentStore {
  async hasProcessed(requestId: string): Promise<boolean> {
    const rows = await supabaseRequest<unknown[]>(
      `checkpoints?select=id&request_id=eq.${encodeURIComponent(requestId)}&limit=1`,
    );
    return rows.length > 0;
  }

  async hasRequest(requestId: string): Promise<boolean> {
    const rows = await supabaseRequest<unknown[]>(
      `payments?select=id&request_id=eq.${encodeURIComponent(requestId)}&limit=1`,
    );
    return rows.length > 0;
  }

  async saveCheckpoint(checkpoint: StoredCheckpoint): Promise<void> {
    await supabaseRequest("checkpoints", {
      method: "POST",
      body: JSON.stringify({
        request_id: checkpoint.requestId,
        product_id: await databaseProductId(checkpoint.point.productId),
        latitude: checkpoint.point.latitude,
        longitude: checkpoint.point.longitude,
        checkpoint_type: checkpointType(checkpoint.point.checkpoint),
        recorded_at: new Date(checkpoint.point.timestamp * 1000).toISOString(),
        risk_score: checkpoint.riskScore,
        anomaly_decision: checkpoint.riskScore >= 61 ? "ANOMALY" : "NORMAL",
      }),
    });
  }

  async saveAnomaly(anomaly: StoredAnomaly): Promise<void> {
    await supabaseRequest("anomalies", {
      method: "POST",
      body: JSON.stringify({
        request_id: anomaly.requestId,
        product_id: await databaseProductId(anomaly.result.productId),
        risk_score: anomaly.result.riskScore,
        reason: anomaly.result.findings.join(" ") || anomaly.result.explanation,
        explanation: anomaly.result.explanation,
        status: anomaly.status,
        chain_tx_hash: anomaly.txHash ?? null,
      }),
    });
  }

  async save(record: PaymentRecord): Promise<void> {
    await supabaseRequest("payments", {
      method: "POST",
      body: JSON.stringify({
        request_id: record.requestId,
        resource: record.resource,
        payer: record.payer,
        amount: record.amount,
        currency: record.currency,
        network: record.network,
        transaction_id: record.transactionId,
        expires_at: record.expiresAt,
        status: record.status,
        created_at: new Date(record.createdAt * 1000).toISOString(),
      }),
    });
  }

  async resolveAnomaly(requestId: string): Promise<void> {
    await supabaseRequest(`anomalies?request_id=eq.${encodeURIComponent(requestId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED", resolved_at: new Date().toISOString() }),
    });
  }

  async getShipments(filters?: { productId?: string; status?: string; sender?: string; receiver?: string }): Promise<ShipmentRow[]> {
    const params: string[] = [];
    if (filters?.productId) params.push(`product_id=eq.${encodeURIComponent(filters.productId)}`);
    if (filters?.status) params.push(`status=eq.${encodeURIComponent(filters.status)}`);
    if (filters?.sender) params.push(`sender_org_id=eq.${encodeURIComponent(filters.sender)}`);
    if (filters?.receiver) params.push(`receiver_org_id=eq.${encodeURIComponent(filters.receiver)}`);
    const query = params.length > 0 ? `?${params.join("&")}&order=created_at.desc` : "?order=created_at.desc";
    return (await supabaseRequest<ShipmentRow[]>(`shipments${query}`)) ?? [];
  }

  async saveShipment(shipment: { id?: string; on_chain_shipment_id?: string | number; product_id: string; sender_org_id?: string | null; receiver_org_id?: string | null; status: ShipmentRow["status"]; chain_tx_hash?: string | null }): Promise<ShipmentRow> {
    const result = await supabaseRequest<ShipmentRow[]>("shipments", {
      method: "POST",
      body: JSON.stringify({
        ...(shipment.id && /^[0-9a-f-]{36}$/i.test(shipment.id) ? { id: shipment.id } : {}),
        ...(shipment.on_chain_shipment_id !== undefined ? { on_chain_shipment_id: shipment.on_chain_shipment_id } : {}),
        product_id: await databaseProductId(shipment.product_id),
        sender_org_id: shipment.sender_org_id ?? null,
        receiver_org_id: shipment.receiver_org_id ?? null,
        status: shipment.status,
        chain_tx_hash: shipment.chain_tx_hash ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    return result?.[0] as ShipmentRow;
  }

  async updateShipment(id: string, updates: { status?: ShipmentRow["status"]; chain_tx_hash?: string | null }): Promise<ShipmentRow | undefined> {
    const column = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "on_chain_shipment_id";
    const result = await supabaseRequest<ShipmentRow[]>(`shipments?${column}=eq.${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    });
    return result?.[0];
  }

  async getCustodyTransfers(productId: string): Promise<CustodyRow[]> {
    return (await supabaseRequest<CustodyRow[]>(`custody_transfers?product_id=eq.${encodeURIComponent(productId)}&order=transferred_at.desc`)) ?? [];
  }

  async saveCustodyTransfer(transfer: { product_id: string; from_org_id: string; to_org_id: string; chain_tx_hash?: string | null }): Promise<CustodyRow> {
    const result = await supabaseRequest<CustodyRow[]>("custody_transfers", {
      method: "POST",
      body: JSON.stringify({
        product_id: String(transfer.product_id),
        from_org_id: transfer.from_org_id,
        to_org_id: transfer.to_org_id,
        chain_tx_hash: transfer.chain_tx_hash ?? null,
        transferred_at: new Date().toISOString(),
      }),
    });
    return result?.[0] as CustodyRow;
  }

  async getEscrows(productId?: string): Promise<EscrowRow[]> {
    const query = productId ? `?product_id=eq.${encodeURIComponent(productId)}&order=created_at.desc` : "?order=created_at.desc";
    return (await supabaseRequest<EscrowRow[]>(`escrows${query}`)) ?? [];
  }

  async saveEscrow(escrow: { id: number | string; product_id: string; buyer_org_id?: string | null; seller_org_id?: string | null; amount: string | number; currency: string; status: EscrowRow["status"]; chain_tx_hash?: string | null }): Promise<EscrowRow> {
    const result = await supabaseRequest<EscrowRow[]>("escrows", {
      method: "POST",
      body: JSON.stringify({
        ...(typeof escrow.id === "string" && /^[0-9a-f-]{36}$/i.test(escrow.id) ? { id: escrow.id } : {}),
        on_chain_escrow_id: escrow.id,
        product_id: await databaseProductId(escrow.product_id),
        buyer_org_id: escrow.buyer_org_id ?? null,
        seller_org_id: escrow.seller_org_id ?? null,
        amount: escrow.amount,
        currency: escrow.currency,
        status: escrow.status,
        chain_tx_hash: escrow.chain_tx_hash ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    return result?.[0] as EscrowRow;
  }

  async updateEscrow(id: string, updates: { status?: EscrowRow["status"]; chain_tx_hash?: string | null }): Promise<EscrowRow | undefined> {
    const column = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "on_chain_escrow_id";
    const result = await supabaseRequest<EscrowRow[]>(`escrows?${column}=eq.${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    });
    return result?.[0];
  }

  async getCheckpoints(productId: string): Promise<CheckpointRow[]> {
    return (await supabaseRequest<CheckpointRow[]>(`checkpoints?product_id=eq.${encodeURIComponent(productId)}&order=recorded_at.desc`)) ?? [];
  }

  async saveCheckpointRecord(checkpoint: Omit<CheckpointRow, "id" | "created_at">): Promise<CheckpointRow | undefined> {
    const result = await supabaseRequest<CheckpointRow[]>("checkpoints", {
      method: "POST",
      body: JSON.stringify(checkpoint),
    });
    return result?.[0];
  }

  async getAnomalies(productId?: string): Promise<AnomalyRow[]> {
    const query = productId ? `?product_id=eq.${encodeURIComponent(productId)}&order=created_at.desc` : "?order=created_at.desc";
    return (await supabaseRequest<AnomalyRow[]>(`anomalies${query}`)) ?? [];
  }

  async updateAnomaly(requestId: string, updates: { status: AnomalyRow["status"]; chain_tx_hash?: string | null }): Promise<AnomalyRow | undefined> {
    const result = await supabaseRequest<AnomalyRow[]>(`anomalies?request_id=eq.${encodeURIComponent(requestId)}`, {
      method: "PATCH",
      body: JSON.stringify({ ...updates, resolved_at: updates.status === "RESOLVED" ? new Date().toISOString() : null }),
    });
    return result?.[0];
  }
}

function checkpointType(label: string): "FACTORY" | "DISTRIBUTOR" | "LOGISTICS_HUB" | "RETAILER" | "CONSUMER_POINT_OF_SALE" {
  const normalized = label.trim().toUpperCase().replace(/[ -]+/g, "_");
  if (["FACTORY", "DISTRIBUTOR", "LOGISTICS_HUB", "RETAILER", "CONSUMER_POINT_OF_SALE"].includes(normalized)) {
    return normalized as ReturnType<typeof checkpointType>;
  }
  return "LOGISTICS_HUB";
}

async function databaseProductId(productId: string): Promise<string> {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) return productId;
  const rows = await supabaseRequest<Array<{ id: string }>>(
    `products?select=id&token_id=eq.${encodeURIComponent(productId)}&limit=1`,
  );
  if (!rows[0]) throw new Error(`No product found for token_id ${productId}`);
  return rows[0].id;
}