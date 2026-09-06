import type {
  BatchStatus,
  ManufacturingOperationType,
  ProductStatus,
} from "./enums";

export type Batch = {
  id: string;
  batch_code: string;
  batch_id_hash: string;
  manufacturer_org_id: string;
  product_name: string;
  product_category: string | null;
  plant_id: string;
  manufacturing_date: string;
  expiry_date: string | null;
  quantity: number;
  minted_count: number;
  status: BatchStatus;
  chain_tx_hash: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  product_code: string;
  product_id_hash: string;
  token_id: number | null;
  batch_id: string;
  serial_number: string;
  manufacturer_org_id: string;
  status: ProductStatus;
  chain_tx_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type ManufacturingOperationStatus = "SUCCESS" | "FAILED" | "PENDING";

export type ManufacturingOperation = {
  id: string;
  operation_type: ManufacturingOperationType;
  batch_id: string | null;
  product_id: string | null;
  performed_by: string | null;
  chain_tx_hash: string | null;
  status: ManufacturingOperationStatus;
  error_message: string | null;
  created_at: string;
};

export type CreateBatchInput = {
  product_name: string;
  batch_code: string;
  plant_id: string;
  manufacturing_date: string;
  expiry_date?: string | null;
  quantity: number;
  product_category?: string | null;
};
