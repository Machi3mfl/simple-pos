alter table public.cash_register_sessions
  add column if not exists business_date date;

update public.cash_register_sessions
set business_date = opened_at::date
where business_date is null;

alter table public.cash_register_sessions
  alter column business_date set default current_date;

alter table public.cash_register_sessions
  alter column business_date set not null;

create index if not exists idx_cash_register_sessions_register_business_date
  on public.cash_register_sessions (cash_register_id, business_date desc);

alter table public.sales
  add column if not exists recorded_at timestamptz not null default now();

alter table public.debt_ledger
  add column if not exists recorded_at timestamptz not null default now();

alter table public.stock_movements
  add column if not exists recorded_at timestamptz not null default now();

insert into public.permissions (id, code, name)
values (
  'cash.session.open.backdate',
  'cash.session.open.backdate',
  'Abrir caja con fecha operativa histórica'
)
on conflict (id) do update
set
  code = excluded.code,
  name = excluded.name;

insert into public.role_permission_assignments (id, role_id, permission_id)
values
  (
    'rpa_supervisor_open_backdate',
    'shift_supervisor',
    'cash.session.open.backdate'
  ),
  (
    'rpa_manager_open_backdate',
    'business_manager',
    'cash.session.open.backdate'
  )
on conflict (id) do update
set
  role_id = excluded.role_id,
  permission_id = excluded.permission_id;
