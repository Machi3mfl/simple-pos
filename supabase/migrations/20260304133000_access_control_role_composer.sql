alter table public.roles
  add column if not exists description text,
  add column if not exists is_system boolean not null default false,
  add column if not exists is_locked boolean not null default false,
  add column if not exists cloned_from_role_id text references public.roles(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists created_by_user_id text references public.app_users(id),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by_user_id text references public.app_users(id);

insert into public.permissions (id, code, name)
values
  ('roles.manage', 'roles.manage', 'Gestionar catálogo de roles')
on conflict (id) do update
set
  code = excluded.code,
  name = excluded.name;

insert into public.role_permission_assignments (id, role_id, permission_id)
values
  ('rpa_admin_roles_manage', 'system_admin', 'roles.manage')
on conflict (id) do update
set
  role_id = excluded.role_id,
  permission_id = excluded.permission_id;

update public.roles
set
  description = case code
    when 'cashier' then 'Preset operativo para caja diaria y ventas del turno.'
    when 'collections_clerk' then 'Preset enfocado en seguimiento de deudas y cobranzas.'
    when 'shift_supervisor' then 'Preset para supervisión operativa y aprobación de desvíos.'
    when 'catalog_manager' then 'Preset para catálogo, precios y stock.'
    when 'business_manager' then 'Preset con visión integral del negocio y operación.'
    when 'executive_readonly' then 'Preset ejecutivo de solo lectura para métricas estratégicas.'
    when 'system_admin' then 'Preset técnico para administrar accesos, soporte y auditoría.'
    when 'service_account' then 'Preset reservado para procesos internos del sistema.'
    else coalesce(description, name)
  end,
  is_system = true,
  is_locked = true,
  created_by_user_id = coalesce(created_by_user_id, 'user_admin_soporte'),
  updated_by_user_id = coalesce(updated_by_user_id, 'user_admin_soporte'),
  updated_at = now()
where code in (
  'cashier',
  'collections_clerk',
  'shift_supervisor',
  'catalog_manager',
  'business_manager',
  'executive_readonly',
  'system_admin',
  'service_account'
);
