-- Team 3
create table ownership_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  owner_wallet_address text not null,
  privy_user_id text,
  claimed_at timestamptz not null default now(),
  chain_tx_hash text
);

create table resale_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  seller_wallet_address text not null,
  buyer_wallet_address text,
  status resale_status not null default 'INITIATED',
  escrow_id uuid references escrows(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_resale_updated_at before update on resale_listings
  for each row execute function set_updated_at();
