-- Team 2 reconciliation for the shared Team 1 schema.
-- This migration is additive and must be run after the canonical Team 1 schema.

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  sender_org_id uuid references organizations(id),
  receiver_org_id uuid references organizations(id),
  status text not null default 'CREATED'
    check (status in ('CREATED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED')),
  chain_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists anomalies (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  product_id uuid not null references products(id),
  risk_score integer not null check (risk_score between 0 and 100),
  reason text not null,
  explanation text,
  status text not null default 'OPEN'
    check (status in ('OPEN', 'RESOLVED', 'DISMISSED')),
  chain_tx_hash text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  resource text not null,
  payer text not null,
  amount numeric not null check (amount >= 0),
  currency text not null,
  network text not null,
  transaction_id text not null unique,
  expires_at bigint not null,
  status text not null check (status in ('VERIFIED', 'REJECTED')),
  created_at timestamptz not null default now()
);

alter table checkpoints add column if not exists request_id text;
alter table checkpoints add column if not exists risk_score integer;
alter table shipments add column if not exists on_chain_shipment_id bigint;
alter table escrows add column if not exists on_chain_escrow_id bigint;
alter table checkpoints drop constraint if exists checkpoints_risk_score_check;
alter table checkpoints add constraint checkpoints_risk_score_check
  check (risk_score is null or risk_score between 0 and 100);

create unique index if not exists checkpoints_request_id_uidx
  on checkpoints(request_id) where request_id is not null;
create unique index if not exists anomalies_request_id_uidx
  on anomalies(request_id) where request_id is not null;
create index if not exists shipments_product_created_idx
  on shipments(product_id, created_at desc);
create index if not exists shipments_sender_org_idx on shipments(sender_org_id);
create index if not exists shipments_receiver_org_idx on shipments(receiver_org_id);
create unique index if not exists shipments_chain_id_uidx
  on shipments(on_chain_shipment_id) where on_chain_shipment_id is not null;
create index if not exists anomalies_product_status_idx on anomalies(product_id, status);
create unique index if not exists escrows_chain_id_uidx
  on escrows(on_chain_escrow_id) where on_chain_escrow_id is not null;
create index if not exists checkpoints_product_recorded_idx
  on checkpoints(product_id, recorded_at desc);
create index if not exists payments_resource_created_idx
  on payments(resource, created_at desc);

alter table shipments enable row level security;
alter table anomalies enable row level security;
alter table payments enable row level security;

notify pgrst, 'reload schema';