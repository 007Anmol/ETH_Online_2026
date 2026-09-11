-- Team 1 manufacturer bootstrap (safe to re-run).
-- Replace the wallet placeholder with the real manufacturer EVM address before demo.

insert into organizations (name, type, wallet_address, world_id_verified)
values (
  'Binance Test Manufacturer',
  'MANUFACTURER',
  lower('0x0000000000000000000000000000000000000001'),
  false
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
  lower('0x0000000000000000000000000000000000000001'),
  organizations.id,
  'MANUFACTURER',
  false,
  'Binance Test Manufacturer'
from organizations
where lower(organizations.wallet_address) = '0x0000000000000000000000000000000000000001'
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
