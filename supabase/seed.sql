-- Phase 1 demo manufacturer. Safe to re-run.
-- Wallet must match frontend/lib/constants.ts DEMO_MANUFACTURER_WALLET

insert into organizations (name, type, wallet_address, world_id_verified)
values (
  'VeriChain Demo Works',
  'MANUFACTURER',
  '0x1111111111111111111111111111111111111111',
  true
)
on conflict (wallet_address) do update
set name = excluded.name,
    type = excluded.type,
    world_id_verified = excluded.world_id_verified;

insert into profiles (
  wallet_address,
  organization_id,
  role,
  world_id_verified,
  display_name
)
select
  '0x1111111111111111111111111111111111111111',
  organizations.id,
  'MANUFACTURER',
  true,
  'Demo Manufacturer'
from organizations
where organizations.wallet_address = '0x1111111111111111111111111111111111111111'
on conflict (wallet_address) do update
set organization_id = excluded.organization_id,
    role = excluded.role,
    world_id_verified = excluded.world_id_verified,
    display_name = excluded.display_name;

insert into role_permissions (role, permission) values
  ('MANUFACTURER', 'CREATE_BATCH'),
  ('MANUFACTURER', 'MINT_PRODUCT'),
  ('MANUFACTURER', 'REGISTER_TAG'),
  ('MANUFACTURER', 'VIEW_PROVENANCE')
on conflict (role, permission) do nothing;

-- Prefer `cd frontend && npm run seed` — it also clears leftover tags.
-- This SQL only upserts the one batch + one TAG_PENDING product.

insert into batches (
  batch_code,
  batch_id_hash,
  manufacturer_org_id,
  product_name,
  plant_id,
  manufacturing_date,
  quantity,
  minted_count,
  status
)
select
  'SAACHI-DEV-001',
  '0x' || encode(sha256('SAACHI-DEV-001'::bytea), 'hex'),
  organizations.id,
  'Rado HyperChrome',
  'MH-01',
  '2026-09-06',
  1,
  1,
  'MINTED'
from organizations
where organizations.wallet_address = '0x1111111111111111111111111111111111111111'
on conflict (batch_code) do update
set status = excluded.status,
    minted_count = excluded.minted_count;

insert into products (
  product_code,
  product_id_hash,
  batch_id,
  serial_number,
  manufacturer_org_id,
  status
)
select
  'VC-SAACHI-000001',
  '0x' || encode(sha256('VC-SAACHI-000001'::bytea), 'hex'),
  batches.id,
  'SN-SAACHI-000001',
  organizations.id,
  'TAG_PENDING'
from batches
join organizations
  on organizations.wallet_address = '0x1111111111111111111111111111111111111111'
where batches.batch_code = 'SAACHI-DEV-001'
on conflict (product_code) do update
set status = 'TAG_PENDING',
    batch_id = excluded.batch_id;
