create table if not exists public.external_category_mappings (
  id text primary key,
  provider_id text not null,
  external_category_path text not null,
  internal_category_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists external_category_mappings_provider_path_unique_idx
  on public.external_category_mappings (provider_id, external_category_path);
