-- Consumer NFT transfer, C2C resale settlement, and grievance tables.
-- Additive only — does not touch existing team1/2/3 tables.
--
-- Escrow note: VeriChainMarketplace's escrow is internal contract-storage
-- accounting (pendingWithdrawals), not a separate object — there is
-- deliberately no FK to the existing org-scoped `escrows` table here (see
-- frontend/CONSUMER_BACKEND_PLAN.md's compatibility audit for why).

create type transfer_status as enum (
  'PENDING_SIGNATURE', 'SUBMITTED', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'REVERTED'
);
create type sync_status as enum ('PENDING', 'SYNCED', 'SYNC_FAILED');

create table ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  from_wallet_address text not null,
  to_wallet_address text not null,
  status transfer_status not null default 'PENDING_SIGNATURE',
  sync_status sync_status not null default 'PENDING',
  chain_tx_hash text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_ownership_transfers_updated_at before update on ownership_transfers
  for each row execute function set_updated_at();
create index idx_ownership_transfers_product on ownership_transfers (product_id);

create type settlement_status as enum (
  'PURCHASE_PENDING', 'PAYMENT_PROTECTED', 'PRODUCT_VALIDATION',
  'SETTLEMENT_BLOCKED', 'SETTLEMENT_PENDING', 'NFT_TRANSFER_PENDING',
  'OWNERSHIP_CONFIRMED', 'PAYMENT_RELEASED', 'COMPLETED', 'FAILED'
);

create table resale_settlements (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references resale_listings(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  buyer_wallet_address text not null,
  seller_wallet_address text not null,
  amount_tinybar numeric not null,
  nft_contract_address text not null,
  marketplace_contract_address text not null,
  status settlement_status not null default 'PURCHASE_PENDING',
  chain_tx_hash text,
  sync_status sync_status not null default 'PENDING',
  transfer_id uuid references ownership_transfers(id),
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_resale_settlements_updated_at before update on resale_settlements
  for each row execute function set_updated_at();
create index idx_resale_settlements_listing on resale_settlements (listing_id);
create unique index uq_one_active_settlement_per_listing on resale_settlements (listing_id)
  where status not in ('COMPLETED', 'FAILED');

create type grievance_category as enum (
  'COUNTERFEIT_SUSPICION', 'DAMAGED_PRODUCT', 'MISSING_HISTORY',
  'OWNERSHIP_DISPUTE', 'OTHER'
);
create type grievance_status as enum (
  'OPEN', 'UNDER_REVIEW', 'WAITING_FOR_CONSUMER', 'RESOLVED', 'REJECTED', 'ESCALATED'
);

create table grievances (
  id uuid primary key default gen_random_uuid(),
  grievance_number text not null unique,
  consumer_profile_id uuid not null references profiles(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  category grievance_category not null,
  description text not null,
  evidence_ref text,
  status grievance_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create trigger trg_grievances_updated_at before update on grievances
  for each row execute function set_updated_at();
create index idx_grievances_consumer on grievances (consumer_profile_id);
create index idx_grievances_product on grievances (product_id);

create table grievance_events (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references grievances(id) on delete cascade,
  status grievance_status not null,
  note text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_grievance_events_grievance on grievance_events (grievance_id);

alter type product_event_type add value if not exists 'TRANSFER_SUBMITTED';
alter type product_event_type add value if not exists 'TRANSFER_CONFIRMED';
alter type product_event_type add value if not exists 'TRANSFER_FAILED';
alter type product_event_type add value if not exists 'SETTLEMENT_BLOCKED';
alter type product_event_type add value if not exists 'SETTLEMENT_COMPLETED';
alter type product_event_type add value if not exists 'GRIEVANCE_SUBMITTED';
alter type product_event_type add value if not exists 'GRIEVANCE_STATUS_CHANGED';

alter table ownership_transfers enable row level security;
alter table resale_settlements enable row level security;
alter table grievances enable row level security;
alter table grievance_events enable row level security;
-- No anon policies: every read/write goes through an API route using the
-- service-role client, matching 0007_rls.sql's existing model.
