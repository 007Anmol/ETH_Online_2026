export type ShipmentRecord = {
  id: string;
  product_id: string;
  sender: string;
  receiver: string;
  status: "CREATED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  tx_hash?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CustodyRecord = {
  id?: string;
  product_id: string;
  from_address: string;
  to_address: string;
  tx_hash?: string | null;
  created_at?: string;
};

export type CheckpointRecord = {
  id?: string;
  request_id?: string | null;
  product_id: string;
  latitude: number;
  longitude: number;
  checkpoint: string;
  observed_at: string;
  risk_score?: number | null;
  tx_hash?: string | null;
  created_at?: string;
};

export type AnomalyRecord = {
  id?: string;
  request_id?: string | null;
  product_id: string;
  risk_score: number;
  reason: string;
  explanation?: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  tx_hash?: string | null;
  resolved_at?: string | null;
  created_at?: string;
};

export type EscrowRecord = {
  id: string;
  product_id: string;
  payer: string;
  payee: string;
  amount_wei: string;
  status: "ACTIVE" | "FROZEN" | "RELEASED" | "RESOLVED";
  tx_hash?: string | null;
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
