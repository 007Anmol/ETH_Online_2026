/**
 * Canonical labels — must match Postgres enum names exactly.
 * Map Solidity uint8 → these names by label, never by integer position.
 */

export const USER_ROLES = [
  "MANUFACTURER",
  "FACTORY_OPERATOR",
  "DISTRIBUTOR",
  "LOGISTICS_PROVIDER",
  "RETAILER",
  "CONSUMER",
  "ADMIN",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ORGANIZATION_TYPES = [
  "MANUFACTURER",
  "DISTRIBUTOR",
  "LOGISTICS_PROVIDER",
  "RETAILER",
] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const PERMISSIONS = [
  "CREATE_BATCH",
  "MINT_PRODUCT",
  "REGISTER_TAG",
  "VIEW_PROVENANCE",
  "VIEW_ASSIGNED_SHIPMENTS",
  "SCAN_PRODUCT",
  "ACCEPT_CUSTODY",
  "TRANSFER_CUSTODY",
  "VERIFY",
  "CLAIM_OWNERSHIP",
  "INITIATE_RESALE",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const BATCH_STATUSES = ["CREATED", "MINTED"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const PRODUCT_STATUSES = [
  "CREATED",
  "MINTED",
  "TAG_PENDING",
  "TAG_BOUND",
  "READY_FOR_DISPATCH",
  "IN_TRANSIT",
  "SUSPECT_COUNTERFEIT",
  "AUTHENTIC",
  "SOLD",
  "OWNED",
  "RESALE_INITIATED",
  "PHYSICAL_HANDOFF_PENDING",
  "NEW_OWNER_CONFIRMED",
  "REVOKED",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const TAG_STATUSES = ["PROVISIONED", "BOUND", "REVOKED"] as const;
export type TagStatus = (typeof TAG_STATUSES)[number];

export const VERIFICATION_RESULTS = [
  "AUTHENTIC",
  "DUPLICATE",
  "INVALID",
  "ERROR",
] as const;
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];

export const ANOMALY_DECISIONS = ["NORMAL", "ANOMALY"] as const;
export type AnomalyDecision = (typeof ANOMALY_DECISIONS)[number];

export const CHECKPOINT_TYPES = [
  "FACTORY",
  "DISTRIBUTOR",
  "LOGISTICS_HUB",
  "RETAILER",
  "CONSUMER_POINT_OF_SALE",
] as const;
export type CheckpointType = (typeof CHECKPOINT_TYPES)[number];

export const ESCROW_STATUSES = [
  "PENDING",
  "LOCKED",
  "RELEASED",
  "FROZEN",
  "REFUNDED",
] as const;
export type EscrowStatus = (typeof ESCROW_STATUSES)[number];

export const RESALE_STATUSES = [
  "INITIATED",
  "AWAITING_PHYSICAL_HANDOFF",
  "HANDOFF_CONFIRMED",
  "OWNERSHIP_TRANSFERRED",
  "CANCELLED",
] as const;
export type ResaleStatus = (typeof RESALE_STATUSES)[number];

export const PRODUCT_EVENT_TYPES = [
  "BATCH_CREATED",
  "BATCH_MINTED",
  "PRODUCT_REGISTERED",
  "DIGITAL_TWIN_CREATED",
  "TAG_BOUND",
  "TAG_REVOKED",
  "PRODUCT_STATUS_CHANGED",
  "NONCE_CONSUMED",
  "CHECKPOINT_RECORDED",
  "CUSTODY_TRANSFERRED",
  "ANOMALY_DETECTED",
  "ESCROW_FROZEN",
  "ESCROW_RELEASED",
  "OWNERSHIP_CLAIMED",
  "RESALE_INITIATED",
  "PHYSICAL_HANDOFF_CONFIRMED",
] as const;
export type ProductEventType = (typeof PRODUCT_EVENT_TYPES)[number];

export const TAG_BINDING_ACTIONS = ["BOUND", "REVOKED"] as const;
export type TagBindingAction = (typeof TAG_BINDING_ACTIONS)[number];

export const MANUFACTURING_OPERATION_TYPES = [
  "CREATE_BATCH",
  "MINT_BATCH",
  "REGISTER_PRODUCT",
  "BIND_TAG",
  "REVOKE_TAG",
] as const;
export type ManufacturingOperationType =
  (typeof MANUFACTURING_OPERATION_TYPES)[number];
