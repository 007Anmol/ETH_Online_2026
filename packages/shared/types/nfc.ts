import type {
  ProductEventType,
  TagBindingAction,
  TagStatus,
  VerificationResult,
} from "./enums";

export type NfcTag = {
  id: string;
  tag_uid: string;
  tag_id_hash: string;
  product_id: string | null;
  status: TagStatus;
  provisioned_at: string;
  bound_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  chain_tx_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type TagBindingHistory = {
  id: string;
  tag_id: string;
  product_id: string;
  action: TagBindingAction;
  performed_by: string | null;
  reason: string | null;
  chain_tx_hash: string | null;
  created_at: string;
};

export type VerificationNonce = {
  id: string;
  tag_id: string;
  nonce_hash: string;
  consumed: boolean;
  consumed_at: string | null;
  chain_tx_hash: string | null;
  created_at: string;
};

/** Payload produced by a real NTAG 424 DNA tap or the simulator. */
export type NfcTapPayload = {
  tag_uid: string;
  nonce: string;
  cmac: string;
};

export type VerificationAttempt = {
  id: string;
  tag_id: string | null;
  product_id: string | null;
  raw_payload: NfcTapPayload;
  result: VerificationResult;
  failure_reason: string | null;
  scanned_by: string | null;
  location: { lat: number; lng: number } | null;
  created_at: string;
};

export type BindTagInput = {
  product_id: string;
  tag_uid: string;
};

export type VerifyProductResponse = {
  result: VerificationResult;
  product_id?: string;
  product_code?: string;
  batch_code?: string;
  product_name?: string;
  manufacturing_date?: string;
  plant_id?: string;
  failure_reason?: string;
};

export type ProductEvent = {
  id: string;
  event_type: ProductEventType;
  product_id: string | null;
  batch_id: string | null;
  tag_id: string | null;
  payload: Record<string, unknown>;
  chain_tx_hash: string | null;
  block_number: number | null;
  occurred_at: string;
};
