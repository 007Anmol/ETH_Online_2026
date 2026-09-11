-- Team 1 manufacturer bootstrap (safe to re-run).
-- Replace the wallet placeholder with the real manufacturer EVM address before demo.

insert into organizations (name, type, wallet_address, world_id_verified)
values (
  'Hedera Test Manufacturer',
  'MANUFACTURER',
  lower('0x383B61c1Cc71bff244857DDb59191312bAFD63Ba'),
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
  lower('0x383B61c1Cc71bff244857DDb59191312bAFD63Ba'),
  organizations.id,
  'MANUFACTURER',
  false,
  'Hedera Test Manufacturer'
from organizations
where lower(organizations.wallet_address) = lower('0x383B61c1Cc71bff244857DDb59191312bAFD63Ba')
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
