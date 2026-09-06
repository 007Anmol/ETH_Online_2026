import type { ResaleStatus } from "./enums";

export type OwnershipRecord = {
  id: string;
  product_id: string;
  owner_wallet_address: string;
  privy_user_id: string | null;
  claimed_at: string;
  chain_tx_hash: string | null;
};

export type ResaleListing = {
  id: string;
  product_id: string;
  seller_wallet_address: string;
  buyer_wallet_address: string | null;
  status: ResaleStatus;
  escrow_id: string | null;
  created_at: string;
  updated_at: string;
};
