import type { AnomalyDecision, CheckpointType, EscrowStatus } from "./enums";

export type Checkpoint = {
  id: string;
  product_id: string;
  tag_id: string | null;
  checkpoint_type: CheckpointType;
  custodian_org_id: string | null;
  latitude: number | null;
  longitude: number | null;
  anomaly_decision: AnomalyDecision | null;
  chain_tx_hash: string | null;
  recorded_at: string;
};

export type CustodyTransfer = {
  id: string;
  product_id: string;
  from_org_id: string | null;
  to_org_id: string | null;
  chain_tx_hash: string | null;
  transferred_at: string;
};

export type Escrow = {
  id: string;
  product_id: string;
  buyer_org_id: string | null;
  seller_org_id: string | null;
  amount: number | null;
  currency: string | null;
  status: EscrowStatus;
  chain_tx_hash: string | null;
  created_at: string;
  updated_at: string;
};
