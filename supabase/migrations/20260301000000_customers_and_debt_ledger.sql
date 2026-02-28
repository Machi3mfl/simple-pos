-- Customers and debt ledger persistence for on-account flows.

create table if not exists customers (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_customers_name_ci
  on customers (lower(name));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_customer_id_fkey'
  ) then
    alter table sales
      add constraint sales_customer_id_fkey
      foreign key (customer_id)
      references customers(id)
      on delete set null;
  end if;
end $$;

create table if not exists debt_ledger (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  entry_type text not null check (entry_type in ('debt', 'payment')),
  order_id text references sales(id) on delete set null,
  amount numeric(12, 4) not null check (amount > 0),
  occurred_at timestamptz not null,
  notes text
);

create index if not exists idx_debt_ledger_customer_occurred_at
  on debt_ledger (customer_id, occurred_at desc);
