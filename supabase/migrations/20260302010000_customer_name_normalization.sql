-- Normalize customer names to avoid duplicate debt ledgers created from casing,
-- extra whitespace, or accent variants in the POS checkout flow.

alter table customers
  add column if not exists normalized_name text;

update customers
set normalized_name = trim(
  regexp_replace(
    translate(
      lower(name),
      'áàäâãéèëêíìïîóòöôõúùüûñç',
      'aaaaaeeeeiiiiooooouuuunc'
    ),
    '\s+',
    ' ',
    'g'
  )
)
where normalized_name is null or normalized_name = '';

alter table customers
  alter column normalized_name set not null;

drop index if exists idx_customers_name_ci;

create unique index if not exists idx_customers_normalized_name
  on customers (normalized_name);
