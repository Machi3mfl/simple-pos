alter table public.products
add column if not exists ean text;

update public.products as products
set ean = imported.ean
from public.imported_product_sources as imported
where imported.product_id = products.id
  and products.ean is null
  and imported.ean is not null;

create index if not exists products_ean_idx on public.products (ean);
