insert into public.role_permission_assignments (id, role_id, permission_id)
values
  (
    'rpa_supervisor_reporting_operational',
    'shift_supervisor',
    'reporting.operational.view'
  )
on conflict (id) do update
set
  role_id = excluded.role_id,
  permission_id = excluded.permission_id;
