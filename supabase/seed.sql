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
