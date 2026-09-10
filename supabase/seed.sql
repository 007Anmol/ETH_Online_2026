-- Demo manufacturer. Safe to re-run.
-- Values must match frontend/lib/constants.ts (wallet, batch, product, category).

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

-- Prefer `cd frontend && npm run seed` — it also clears leftover tags and writes keccak256 hashes.
-- This SQL only upserts the one batch + one TAG_PENDING product.
-- Hashes must be keccak256(utf8 bytes), matching Solidity keccak256(bytes(...)).

insert into batches (
  batch_code,
  batch_id_hash,
  manufacturer_org_id,
  product_name,
  product_category,
  plant_id,
  manufacturing_date,
  quantity,
  minted_count,
  status
)
select
  'SAACHI-DEV-001',
  '0x800b7c304c7d5e0941cbd22199381ba84c314d7f29979aea62cb86f1c5a24869',
  organizations.id,
  'Rado HyperChrome',
  'WATCHES',
  'MH-01',
  '2026-09-06',
  1,
  1,
  'MINTED'
from organizations
where organizations.wallet_address = '0x1111111111111111111111111111111111111111'
on conflict (batch_code) do update
set status = excluded.status,
    minted_count = excluded.minted_count,
    product_name = excluded.product_name,
    product_category = excluded.product_category,
    plant_id = excluded.plant_id,
    manufacturing_date = excluded.manufacturing_date;

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
  '0xed817a6846fc050e090737335149b55f79d0ba71c58846f45e70b9adece9f194',
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
