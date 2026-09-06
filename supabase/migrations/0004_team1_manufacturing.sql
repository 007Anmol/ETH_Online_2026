create table batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,           -- human-readable, e.g. "RADO-2026-001"
  batch_id_hash text not null unique,        -- keccak256(batch_code) — must match on-chain bytes32
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
create index idx_batches_manufacturer on batches (manufacturer_org_id);
create index idx_batches_status on batches (status);
create trigger trg_batches_updated_at before update on batches
  for each row execute function set_updated_at();

create table products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,          -- "VC-RADO-000001"
  product_id_hash text not null unique,       -- keccak256(product_code)
  token_id bigint unique,                     -- digital twin ID, null until minted
  batch_id uuid not null references batches(id) on delete restrict,
  serial_number text not null unique,
  manufacturer_org_id uuid not null references organizations(id) on delete restrict,
  status product_status not null default 'CREATED',
  chain_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_batch on products (batch_id);
create index idx_products_status on products (status);
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

create table nfc_tags (
  id uuid primary key default gen_random_uuid(),
  tag_uid text not null unique,               -- raw NTAG 424 DNA hardware UID (hex)
  tag_id_hash text not null unique,           -- keccak256(tag_uid) — matches on-chain bytes32
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
-- Enforces "1 product = 1 currently-active tag" at the database level too
create unique index uq_one_bound_tag_per_product on nfc_tags (product_id) where status = 'BOUND';
create index idx_nfc_tags_product on nfc_tags (product_id);
create trigger trg_nfc_tags_updated_at before update on nfc_tags
  for each row execute function set_updated_at();

-- Append-only — this is what lets you show "Original Tag → Revoked → Replacement Tag"
create table tag_binding_history (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references nfc_tags(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  action text not null check (action in ('BOUND', 'REVOKED')),
  performed_by uuid references profiles(id),
  reason text,
  chain_tx_hash text,
  created_at timestamptz not null default now()
);
create index idx_tag_history_tag on tag_binding_history (tag_id);
create index idx_tag_history_product on tag_binding_history (product_id);

-- Off-chain mirror for fast lookups; the contract remains the real source of truth
create table verification_nonces (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references nfc_tags(id) on delete restrict,
  nonce_hash text not null unique,
  consumed boolean not null default false,
  consumed_at timestamptz,
  chain_tx_hash text,
  created_at timestamptz not null default now()
);
create index idx_nonces_tag on verification_nonces (tag_id);

create table verification_attempts (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid references nfc_tags(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  raw_payload jsonb not null,          -- tag_id, nonce, cmac exactly as received
  result verification_result not null,
  failure_reason text,
  scanned_by uuid references profiles(id),
  location jsonb,                      -- { lat, lng } if available
  created_at timestamptz not null default now()
);
create index idx_verification_attempts_tag on verification_attempts (tag_id);
create index idx_verification_attempts_result on verification_attempts (result);

create table manufacturing_operations (
  id uuid primary key default gen_random_uuid(),
  operation_type text not null check (operation_type in
    ('CREATE_BATCH','MINT_BATCH','REGISTER_PRODUCT','BIND_TAG','REVOKE_TAG')),
  batch_id uuid references batches(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  performed_by uuid references profiles(id),
  chain_tx_hash text,
  status text not null default 'SUCCESS' check (status in ('SUCCESS','FAILED','PENDING')),
  error_message text,
  created_at timestamptz not null default now()
);
create index idx_mfg_ops_batch on manufacturing_operations (batch_id);

create table product_events (
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
create index idx_product_events_product on product_events (product_id);
create index idx_product_events_type on product_events (event_type);
