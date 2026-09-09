import type { PaymentRecord } from "../../../packages/shared/types/payment";
import type { AnomalyStore, StoredAnomaly, StoredCheckpoint } from "./anomaly";
import type { PaymentStore } from "../../hedera/src/payments";

type ShipmentRow = { id: string; product_id: string; sender: string; receiver: string; status: "CREATED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED"; tx_hash?: string | null; created_at?: string; updated_at?: string };
type CustodyRow = { id?: string; product_id: string; from_address: string; to_address: string; tx_hash?: string | null; created_at?: string };
type CheckpointRow = { id?: string; request_id?: string | null; product_id: string; latitude: number; longitude: number; checkpoint: string; observed_at: string; risk_score?: number | null; tx_hash?: string | null; created_at?: string };
type AnomalyRow = { id?: string; request_id?: string | null; product_id: string; risk_score: number; reason: string; explanation?: string | null; status: "OPEN" | "RESOLVED" | "DISMISSED"; tx_hash?: string | null; resolved_at?: string | null; created_at?: string };
type EscrowRow = { id: string; product_id: string; payer: string; payee: string; amount_wei: string; status: "ACTIVE" | "FROZEN" | "RELEASED" | "RESOLVED"; tx_hash?: string | null; created_at?: string; updated_at?: string };

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
        product_id: Number(checkpoint.point.productId),
        latitude: checkpoint.point.latitude,
        longitude: checkpoint.point.longitude,
        checkpoint: checkpoint.point.checkpoint,
        observed_at: new Date(checkpoint.point.timestamp * 1000).toISOString(),
        risk_score: checkpoint.riskScore,
      }),
    });
  }

  async saveAnomaly(anomaly: StoredAnomaly): Promise<void> {
    await supabaseRequest("anomalies", {
      method: "POST",
      body: JSON.stringify({
        request_id: anomaly.requestId,
        product_id: Number(anomaly.result.productId),
        risk_score: anomaly.result.riskScore,
        reason: anomaly.result.findings.join(" ") || anomaly.result.explanation,
        explanation: anomaly.result.explanation,
        status: anomaly.status,
        tx_hash: anomaly.txHash ?? null,
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
    if (filters?.sender) params.push(`sender=eq.${encodeURIComponent(filters.sender)}`);
    if (filters?.receiver) params.push(`receiver=eq.${encodeURIComponent(filters.receiver)}`);
    const query = params.length > 0 ? `?${params.join("&")}&order=created_at.desc` : "?order=created_at.desc";
    return (await supabaseRequest<ShipmentRow[]>(`shipments${query}`)) ?? [];
  }

  async saveShipment(shipment: { id: number | string; product_id: number | string; sender: string; receiver: string; status: ShipmentRow["status"]; tx_hash?: string | null }): Promise<ShipmentRow> {
    const result = await supabaseRequest<ShipmentRow[]>("shipments", {
      method: "POST",
      body: JSON.stringify({
        id: Number(shipment.id),
        product_id: Number(shipment.product_id),
        sender: shipment.sender,
        receiver: shipment.receiver,
        status: shipment.status,
        tx_hash: shipment.tx_hash ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    return result?.[0] ?? { ...shipment, id: String(shipment.id), product_id: String(shipment.product_id) };
  }

  async updateShipment(id: number | string, updates: { status?: ShipmentRow["status"]; tx_hash?: string | null }): Promise<ShipmentRow | undefined> {
    const result = await supabaseRequest<ShipmentRow[]>(`shipments?id=eq.${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    });
    return result?.[0];
  }

  async getCustodyTransfers(productId: string): Promise<CustodyRow[]> {
    return (await supabaseRequest<CustodyRow[]>(`custody_transfers?product_id=eq.${encodeURIComponent(productId)}&order=created_at.desc`)) ?? [];
  }

  async saveCustodyTransfer(transfer: { product_id: number | string; from_address: string; to_address: string; tx_hash?: string | null }): Promise<CustodyRow> {
    const result = await supabaseRequest<CustodyRow[]>("custody_transfers", {
      method: "POST",
      body: JSON.stringify({
        product_id: Number(transfer.product_id),
        from_address: transfer.from_address,
        to_address: transfer.to_address,
        tx_hash: transfer.tx_hash ?? null,
        created_at: new Date().toISOString(),
      }),
    });
    return result?.[0] ?? { ...transfer, product_id: String(transfer.product_id) };
  }

  async getEscrows(productId?: string): Promise<EscrowRow[]> {
    const query = productId ? `?product_id=eq.${encodeURIComponent(productId)}&order=created_at.desc` : "?order=created_at.desc";
    return (await supabaseRequest<EscrowRow[]>(`escrows${query}`)) ?? [];
  }

  async saveEscrow(escrow: { id: number | string; product_id: number | string; payer: string; payee: string; amount_wei: string | number; status: EscrowRow["status"]; tx_hash?: string | null }): Promise<EscrowRow> {
    const result = await supabaseRequest<EscrowRow[]>("escrows", {
      method: "POST",
      body: JSON.stringify({
        id: Number(escrow.id),
        product_id: Number(escrow.product_id),
        payer: escrow.payer,
        payee: escrow.payee,
        amount_wei: escrow.amount_wei,
        status: escrow.status,
        tx_hash: escrow.tx_hash ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    return result?.[0] ?? { ...escrow, id: String(escrow.id), product_id: String(escrow.product_id), amount_wei: String(escrow.amount_wei) };
  }

  async updateEscrow(id: number | string, updates: { status?: EscrowRow["status"]; tx_hash?: string | null }): Promise<EscrowRow | undefined> {
    const result = await supabaseRequest<EscrowRow[]>(`escrows?id=eq.${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    });
    return result?.[0];
  }

  async getCheckpoints(productId: string): Promise<CheckpointRow[]> {
    return (await supabaseRequest<CheckpointRow[]>(`checkpoints?product_id=eq.${encodeURIComponent(productId)}&order=observed_at.desc`)) ?? [];
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

  async updateAnomaly(requestId: string, updates: { status: AnomalyRow["status"]; tx_hash?: string | null }): Promise<AnomalyRow | undefined> {
    const result = await supabaseRequest<AnomalyRow[]>(`anomalies?request_id=eq.${encodeURIComponent(requestId)}`, {
      method: "PATCH",
      body: JSON.stringify({ ...updates, resolved_at: updates.status === "RESOLVED" ? new Date().toISOString() : null }),
    });
    return result?.[0];
  }
}