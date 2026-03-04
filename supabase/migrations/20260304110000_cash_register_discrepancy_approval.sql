alter table public.cash_register_sessions
  add column if not exists closeout_submitted_at timestamptz,
  add column if not exists closeout_submitted_by_user_id text references public.app_users(id),
  add column if not exists discrepancy_approved_at timestamptz,
  add column if not exists discrepancy_approved_by_user_id text references public.app_users(id),
  add column if not exists discrepancy_approval_notes text;

insert into public.permissions (id, code, name)
values (
  'cash.session.close.override_discrepancy',
  'cash.session.close.override_discrepancy',
  'Aprobar cierre de caja con diferencia'
)
on conflict (id) do update
set
  code = excluded.code,
  name = excluded.name;

insert into public.role_permission_assignments (id, role_id, permission_id)
values
  (
    'rpa_supervisor_close_override_discrepancy',
    'shift_supervisor',
    'cash.session.close.override_discrepancy'
  ),
  (
    'rpa_manager_close_override_discrepancy',
    'business_manager',
    'cash.session.close.override_discrepancy'
  )
on conflict (id) do update
set
  role_id = excluded.role_id,
  permission_id = excluded.permission_id;
