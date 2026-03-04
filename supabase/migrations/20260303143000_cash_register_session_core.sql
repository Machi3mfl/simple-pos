create table if not exists public.cash_register_sessions (
  id text primary key,
  cash_register_id text not null references public.cash_registers(id),
  status text not null check (status in ('open', 'closing_review_required', 'closed', 'voided')),
  opening_float_amount numeric(12, 4) not null check (opening_float_amount >= 0),
  expected_balance_amount numeric(12, 4) not null check (expected_balance_amount >= 0),
  counted_closing_amount numeric(12, 4),
  discrepancy_amount numeric(12, 4),
  opened_at timestamptz not null,
  opened_by_user_id text not null references public.app_users(id),
  closed_at timestamptz,
  closed_by_user_id text references public.app_users(id),
  opening_notes text,
  closing_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_open_cash_session_per_register
  on public.cash_register_sessions (cash_register_id)
  where status in ('open', 'closing_review_required');

create index if not exists idx_cash_register_sessions_register
  on public.cash_register_sessions (cash_register_id, opened_at desc);

create table if not exists public.cash_movements (
  id text primary key,
  cash_register_session_id text not null references public.cash_register_sessions(id) on delete cascade,
  cash_register_id text not null references public.cash_registers(id),
  movement_type text not null check (
    movement_type in (
      'opening_float',
      'cash_sale',
      'debt_payment_cash',
      'cash_paid_in',
      'cash_paid_out',
      'safe_drop',
      'refund_cash',
      'adjustment'
    )
  ),
  direction text not null check (direction in ('inbound', 'outbound')),
  amount numeric(12, 4) not null check (amount >= 0),
  reason_code text,
  notes text,
  sale_id text,
  debt_ledger_entry_id text,
  occurred_at timestamptz not null,
  performed_by_user_id text not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_cash_movements_session
  on public.cash_movements (cash_register_session_id, occurred_at asc);

create index if not exists idx_cash_movements_register
  on public.cash_movements (cash_register_id, occurred_at desc);
