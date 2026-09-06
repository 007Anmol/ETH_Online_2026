-- Auth is wallet + World ID, not auth.uid(). Writes go through the service role.
-- Enable RLS on every table; only products are readable by anon.

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table role_permissions enable row level security;
alter table batches enable row level security;
alter table products enable row level security;
alter table nfc_tags enable row level security;
alter table tag_binding_history enable row level security;
alter table verification_nonces enable row level security;
alter table verification_attempts enable row level security;
alter table manufacturing_operations enable row level security;
alter table product_events enable row level security;
alter table checkpoints enable row level security;
alter table custody_transfers enable row level security;
alter table escrows enable row level security;
alter table ownership_records enable row level security;
alter table resale_listings enable row level security;

create policy "public_can_read_basic_product_info"
on products for select
to anon
using (true);
