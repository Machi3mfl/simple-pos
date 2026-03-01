alter table public.products
  add column if not exists sku text,
  add column if not exists min_stock integer not null default 0;

update public.products
set sku = concat(
  upper(left(regexp_replace(category_id, '[^a-zA-Z0-9]', '', 'g'), 3)),
  '-',
  upper(right(replace(id, '-', ''), 6))
)
where sku is null or btrim(sku) = '';

alter table public.products
  alter column sku set not null;

create unique index if not exists products_sku_unique_idx on public.products (sku);

update public.products
set min_stock = greatest(coalesce(min_stock, 0), 0);

insert into public.inventory_items (product_id, stock_on_hand, weighted_average_unit_cost)
select
  products.id,
  greatest(coalesce(products.stock, 0), 0),
  greatest(coalesce(products.cost, 0), 0)
from public.products
left join public.inventory_items
  on inventory_items.product_id = products.id
where inventory_items.product_id is null;
