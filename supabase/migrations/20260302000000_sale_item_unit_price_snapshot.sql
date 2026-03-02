alter table sale_items
  add column if not exists unit_price numeric(12, 4);

update sale_items
set unit_price = products.price
from products
where sale_items.product_id = products.id
  and sale_items.unit_price is null;

alter table sale_items
  alter column unit_price set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sale_items_unit_price_positive'
  ) then
    alter table sale_items
      add constraint sale_items_unit_price_positive
      check (unit_price > 0);
  end if;
end $$;
