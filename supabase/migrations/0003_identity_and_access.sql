create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type organization_type not null,
  wallet_address text not null unique,
  world_id_verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_organizations_wallet on organizations (wallet_address);
create trigger trg_organizations_updated_at before update on organizations
  for each row execute function set_updated_at();

create table profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  organization_id uuid references organizations(id) on delete set null,
  role user_role not null,
  world_id_verified boolean not null default false,
  world_id_nullifier_hash text unique, -- prevents the same human verifying twice
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_wallet on profiles (wallet_address);
create index idx_profiles_org on profiles (organization_id);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create table role_permissions (
  role user_role not null,
  permission permission not null,
  primary key (role, permission)
);
