import type { PaymentRecord } from "../../../packages/shared/types/payment";
import type { AnomalyStore, StoredAnomaly, StoredCheckpoint } from "./anomaly";
import type { PaymentStore } from "../../hedera/src/payments";

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
}