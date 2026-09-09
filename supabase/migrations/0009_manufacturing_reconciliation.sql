alter table manufacturing_operations
  add column if not exists metadata jsonb not null default '{}'::jsonb;