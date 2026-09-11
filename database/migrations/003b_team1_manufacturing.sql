-- Team 1 manufacturing tables (products / batches / NFC).
-- Idempotent: safe if Team 1 already created these tables.

create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  batch_id_hash text not null unique,
  manufacturer_org_id uuid not null references organizations(id) on delete restrict,
  product_name text not null,
  product_category text,
  plant_id text not null,
  manufacturing_date date not null,
  expiry_date date,
  quantity integer not null check (quantity > 0),
  minted_count integer not null default 0 check (minted_count >= 0),
  status batch_status not null default 'CREATED',
  chain_tx_hash text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minted_not_exceeding_quantity check (minted_count <= quantity)
);
create index if not exists idx_batches_manufacturer on batches (manufacturer_org_id);
create index if not exists idx_batches_status on batches (status);
drop trigger if exists trg_batches_updated_at on batches;
create trigger trg_batches_updated_at before update on batches
  for each row execute function set_updated_at();

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,
  product_id_hash text not null unique,
  token_id bigint unique,
  batch_id uuid not null references batches(id) on delete restrict,
  serial_number text not null unique,
  manufacturer_org_id uuid not null references organizations(id) on delete restrict,
  status product_status not null default 'CREATED',
  chain_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_batch on products (batch_id);
create index if not exists idx_products_status on products (status);
drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

create table if not exists nfc_tags (
  id uuid primary key default gen_random_uuid(),
  tag_uid text not null unique,
  tag_id_hash text not null unique,
  product_id uuid references products(id) on delete set null,
  status tag_status not null default 'PROVISIONED',
  provisioned_at timestamptz not null default now(),
  bound_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  chain_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_one_bound_tag_per_product on nfc_tags (product_id) where status = 'BOUND';
create index if not exists idx_nfc_tags_product on nfc_tags (product_id);
drop trigger if exists trg_nfc_tags_updated_at on nfc_tags;
create trigger trg_nfc_tags_updated_at before update on nfc_tags
  for each row execute function set_updated_at();

create table if not exists tag_binding_history (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references nfc_tags(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  action text not null check (action in ('BOUND', 'REVOKED')),
  performed_by uuid references profiles(id),
  reason text,
  chain_tx_hash text,
  created_at timestamptz not null default now()
);
create index if not exists idx_tag_history_tag on tag_binding_history (tag_id);
create index if not exists idx_tag_history_product on tag_binding_history (product_id);

create table if not exists verification_nonces (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references nfc_tags(id) on delete restrict,
  nonce_hash text not null unique,
  consumed boolean not null default false,
  consumed_at timestamptz,
  chain_tx_hash text,
  created_at timestamptz not null default now()
);
create index if not exists idx_nonces_tag on verification_nonces (tag_id);

create table if not exists verification_attempts (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid references nfc_tags(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  raw_payload jsonb not null,
  result verification_result not null,
  failure_reason text,
  scanned_by uuid references profiles(id),
  location jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_verification_attempts_tag on verification_attempts (tag_id);
create index if not exists idx_verification_attempts_result on verification_attempts (result);

create table if not exists manufacturing_operations (
  id uuid primary key default gen_random_uuid(),
  operation_type text not null check (operation_type in
    ('CREATE_BATCH','MINT_BATCH','REGISTER_PRODUCT','BIND_TAG','REVOKE_TAG')),
  batch_id uuid references batches(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  performed_by uuid references profiles(id),
  chain_tx_hash text,
  status text not null default 'SUCCESS' check (status in ('SUCCESS','FAILED','PENDING')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_mfg_ops_batch on manufacturing_operations (batch_id);

create table if not exists product_events (
  id uuid primary key default gen_random_uuid(),
  event_type product_event_type not null,
  product_id uuid references products(id) on delete set null,
  batch_id uuid references batches(id) on delete set null,
  tag_id uuid references nfc_tags(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  chain_tx_hash text,
  block_number bigint,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_product_events_product on product_events (product_id);
create index if not exists idx_product_events_type on product_events (event_type);

-- Minimal Team 2 base tables so 004_team2_shared_schema.sql can alter them.
create table if not exists checkpoints (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  tag_id uuid references nfc_tags(id),
  checkpoint_type checkpoint_type not null,
  custodian_org_id uuid references organizations(id),
  latitude numeric(9,6),
  longitude numeric(9,6),
  anomaly_decision anomaly_decision,
  chain_tx_hash text,
  recorded_at timestamptz not null default now()
);

create table if not exists custody_transfers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  from_org_id uuid references organizations(id),
  to_org_id uuid references organizations(id),
  chain_tx_hash text,
  transferred_at timestamptz not null default now()
);

create table if not exists escrows (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  buyer_org_id uuid references organizations(id),
  seller_org_id uuid references organizations(id),
  amount numeric,
  currency text default 'USDC',
  status escrow_status not null default 'PENDING',
  chain_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_escrows_updated_at on escrows;
create trigger trg_escrows_updated_at before update on escrows
  for each row execute function set_updated_at();
