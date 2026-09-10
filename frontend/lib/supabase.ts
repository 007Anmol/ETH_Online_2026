export type ShipmentRecord = {
  id: string;
  on_chain_shipment_id?: string | number | null;
  product_id: string;
  sender_org_id?: string | null;
  receiver_org_id?: string | null;
  status: "CREATED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  chain_tx_hash?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CustodyRecord = {
  id?: string;
  product_id: string;
  from_org_id?: string | null;
  to_org_id?: string | null;
  chain_tx_hash?: string | null;
  transferred_at?: string;
};

export type CheckpointRecord = {
  id?: string;
  request_id?: string | null;
  product_id: string;
  latitude: number;
  longitude: number;
  checkpoint_type: string;
  recorded_at: string;
  anomaly_decision?: "NORMAL" | "ANOMALY" | null;
  risk_score?: number | null;
  chain_tx_hash?: string | null;
};

export type AnomalyRecord = {
  id?: string;
  request_id?: string | null;
  product_id: string;
  risk_score: number;
  reason: string;
  explanation?: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  chain_tx_hash?: string | null;
  resolved_at?: string | null;
  created_at?: string;
};

export type EscrowRecord = {
  id: string;
  product_id: string;
  buyer_org_id?: string | null;
  seller_org_id?: string | null;
  amount?: string | number | null;
  currency: string;
  status: "PENDING" | "LOCKED" | "RELEASED" | "FROZEN" | "REFUNDED";
  chain_tx_hash?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function fetchShipments(filters?: {
  productId?: string;
  status?: string;
}): Promise<ShipmentRecord[]> {
  const params = new URLSearchParams();
  if (filters?.productId) params.set("productId", filters.productId);
  if (filters?.status) params.set("status", filters.status);

  const res = await fetch(`/api/shipments?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch shipments" }));
    throw new Error(err.error || "Failed to fetch shipments");
  }

  const data = await res.json();
  return data.shipments ?? [];
}

export async function createShipmentRecord(
  shipment: ShipmentRecord
): Promise<ShipmentRecord> {
  const res = await fetch("/api/shipments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(shipment),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create shipment" }));
    throw new Error(err.error || "Failed to create shipment");
  }

  const data = await res.json();
  return data.shipment;
}

export async function updateShipmentRecord(
  id: string,
  updates: Partial<ShipmentRecord>
): Promise<ShipmentRecord> {
  const res = await fetch("/api/shipments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update shipment" }));
    throw new Error(err.error || "Failed to update shipment");
  }

  const data = await res.json();
  return data.shipment;
}

export async function fetchEscrows(productId?: string): Promise<EscrowRecord[]> {
  const params = new URLSearchParams();
  if (productId) params.set("productId", productId);

  const res = await fetch(`/api/escrow?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch escrows" }));
    throw new Error(err.error || "Failed to fetch escrows");
  }

  const data = await res.json();
  return data.escrows ?? [];
}

export async function saveEscrowRecord(
  escrow: EscrowRecord
): Promise<EscrowRecord> {
  const res = await fetch("/api/escrow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(escrow),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to save escrow" }));
    throw new Error(err.error || "Failed to save escrow");
  }

  const data = await res.json();
  return data.escrow;
}

export async function fetchCheckpoints(productId: string): Promise<CheckpointRecord[]> {
  const res = await fetch(`/api/checkpoints/records?productId=${encodeURIComponent(productId)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch checkpoints");
  return (await res.json()).checkpoints ?? [];
}

export async function fetchAnomalies(productId?: string): Promise<AnomalyRecord[]> {
  const query = productId ? `?productId=${encodeURIComponent(productId)}` : "";
  const res = await fetch(`/api/anomalies${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch anomalies");
  return (await res.json()).anomalies ?? [];
}

export async function fetchCustodyTransfers(productId: string): Promise<CustodyRecord[]> {
  const res = await fetch(`/api/custody?productId=${encodeURIComponent(productId)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch custody transfers");
  return (await res.json()).transfers ?? [];
}
