-- Luxury-item categories. Must match packages/shared/types/enums.ts.
-- Safe to re-run in the Supabase SQL editor.
do $$ begin
  create type product_category as enum ('WATCHES', 'SHOES', 'BAGS', 'APPAREL');
exception
  when duplicate_object then null;
end $$;

-- Map leftover free-text values before tightening the column.
update batches
set product_category = case
  when lower(coalesce(product_category::text, '')) like '%shoe%' then 'SHOES'
  when lower(coalesce(product_category::text, '')) like '%bag%' then 'BAGS'
  when lower(coalesce(product_category::text, '')) like '%apparel%'
    or lower(coalesce(product_category::text, '')) like '%cloth%' then 'APPAREL'
  else 'WATCHES'
end
where product_category is null
   or product_category::text not in ('WATCHES', 'SHOES', 'BAGS', 'APPAREL');

alter table batches
  alter column product_category type product_category
    using product_category::product_category;

alter table batches
  alter column product_category set not null;

alter table batches
  alter column manufacturing_date set default current_date;

alter table batches
  drop column if exists expiry_date;
