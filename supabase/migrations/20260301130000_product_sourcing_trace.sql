create table if not exists public.imported_product_sources (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  provider_id text not null,
  source_product_id text not null,
  source_image_url text not null,
  stored_image_path text not null,
  stored_image_public_url text not null,
  stored_image_content_type text not null,
  stored_image_size_bytes integer not null check (stored_image_size_bytes > 0),
  product_url text,
  brand text,
  ean text,
  category_trail jsonb not null default '[]'::jsonb,
  mapped_category_id text not null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists imported_product_sources_product_id_unique_idx
  on public.imported_product_sources (product_id);

create unique index if not exists imported_product_sources_source_unique_idx
  on public.imported_product_sources (provider_id, source_product_id);
