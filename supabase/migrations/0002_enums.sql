-- Who is interacting with the system
create type user_role as enum (
  'MANUFACTURER', 'FACTORY_OPERATOR', 'DISTRIBUTOR',
  'LOGISTICS_PROVIDER', 'RETAILER', 'CONSUMER', 'ADMIN'
);

create type organization_type as enum (
  'MANUFACTURER', 'DISTRIBUTOR', 'LOGISTICS_PROVIDER', 'RETAILER'
);

-- Fine-grained action permissions, mapped to roles via role_permissions table
create type permission as enum (
  'CREATE_BATCH', 'MINT_PRODUCT', 'REGISTER_TAG', 'VIEW_PROVENANCE',
  'VIEW_ASSIGNED_SHIPMENTS', 'SCAN_PRODUCT', 'ACCEPT_CUSTODY', 'TRANSFER_CUSTODY',
  'VERIFY', 'CLAIM_OWNERSHIP', 'INITIATE_RESALE'
);

-- === Team 1 owns these three — they must match the on-chain enums by NAME ===
create type batch_status as enum ('CREATED', 'MINTED');

create type product_status as enum (
  'CREATED', 'MINTED', 'TAG_PENDING', 'TAG_BOUND', 'READY_FOR_DISPATCH', -- Team 1
  'IN_TRANSIT', 'SUSPECT_COUNTERFEIT',                                   -- Team 2
  'AUTHENTIC', 'SOLD', 'OWNED', 'RESALE_INITIATED',
  'PHYSICAL_HANDOFF_PENDING', 'NEW_OWNER_CONFIRMED',                     -- Team 3
  'REVOKED'                                                              -- Team 1
);

create type tag_status as enum ('PROVISIONED', 'BOUND', 'REVOKED');

-- Outcome of an NFC verify attempt
create type verification_result as enum ('AUTHENTIC', 'DUPLICATE', 'INVALID', 'ERROR');

-- === Team 2 ===
create type anomaly_decision as enum ('NORMAL', 'ANOMALY');
create type checkpoint_type as enum ('FACTORY', 'DISTRIBUTOR', 'LOGISTICS_HUB', 'RETAILER', 'CONSUMER_POINT_OF_SALE');
create type escrow_status as enum ('PENDING', 'LOCKED', 'RELEASED', 'FROZEN', 'REFUNDED');

-- === Team 3 ===
create type resale_status as enum ('INITIATED', 'AWAITING_PHYSICAL_HANDOFF', 'HANDOFF_CONFIRMED', 'OWNERSHIP_TRANSFERRED', 'CANCELLED');

-- Off-chain mirror of every on-chain event, shared by all teams
create type product_event_type as enum (
  'BATCH_CREATED', 'BATCH_MINTED', 'PRODUCT_REGISTERED', 'DIGITAL_TWIN_CREATED',
  'TAG_BOUND', 'TAG_REVOKED', 'PRODUCT_STATUS_CHANGED', 'NONCE_CONSUMED',
  'CHECKPOINT_RECORDED', 'CUSTODY_TRANSFERRED', 'ANOMALY_DETECTED',
  'ESCROW_FROZEN', 'ESCROW_RELEASED', 'OWNERSHIP_CLAIMED',
  'RESALE_INITIATED', 'PHYSICAL_HANDOFF_CONFIRMED'
);
