-- Team 2
create table checkpoints (
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

create table custody_transfers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  from_org_id uuid references organizations(id),
  to_org_id uuid references organizations(id),
  chain_tx_hash text,
  transferred_at timestamptz not null default now()
);

create table escrows (
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
create trigger trg_escrows_updated_at before update on escrows
  for each row execute function set_updated_at();
