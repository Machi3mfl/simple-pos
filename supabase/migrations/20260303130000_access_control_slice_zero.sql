create table if not exists public.cash_registers (
  id text primary key,
  name text not null,
  location_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id text primary key,
  auth_user_id uuid unique,
  display_name text not null,
  actor_kind text not null check (actor_kind in ('human', 'system')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.roles (
  id text primary key,
  code text not null unique,
  name text not null
);

create table if not exists public.permissions (
  id text primary key,
  code text not null unique,
  name text not null
);

create table if not exists public.user_role_assignments (
  id text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  role_id text not null references public.roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by_user_id text references public.app_users(id),
  unique (user_id, role_id)
);

create table if not exists public.role_permission_assignments (
  id text primary key,
  role_id text not null references public.roles(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  unique (role_id, permission_id)
);

create table if not exists public.cash_register_user_assignments (
  id text primary key,
  cash_register_id text not null references public.cash_registers(id) on delete cascade,
  user_id text not null references public.app_users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by_user_id text references public.app_users(id),
  unique (cash_register_id, user_id)
);

insert into public.cash_registers (id, name, location_code, is_active)
values
  ('front-counter', 'Caja principal', 'front-counter', true)
on conflict (id) do update
set
  name = excluded.name,
  location_code = excluded.location_code,
  is_active = excluded.is_active;

insert into public.roles (id, code, name)
values
  ('cashier', 'cashier', 'Cajera'),
  ('collections_clerk', 'collections_clerk', 'Cobranzas'),
  ('shift_supervisor', 'shift_supervisor', 'Supervisor de turno'),
  ('catalog_manager', 'catalog_manager', 'Gestión de productos'),
  ('business_manager', 'business_manager', 'Gerencia'),
  ('executive_readonly', 'executive_readonly', 'Dirección'),
  ('system_admin', 'system_admin', 'System admin'),
  ('service_account', 'service_account', 'Service account')
on conflict (id) do update
set
  code = excluded.code,
  name = excluded.name;

insert into public.permissions (id, code, name)
values
  ('checkout.sale.create', 'checkout.sale.create', 'Crear venta en caja'),
  ('cash.session.open', 'cash.session.open', 'Abrir caja'),
  ('cash.session.close', 'cash.session.close', 'Cerrar caja'),
  ('cash.movement.manual.record', 'cash.movement.manual.record', 'Registrar movimiento manual de caja'),
  ('sales_history.view', 'sales_history.view', 'Ver ventas'),
  ('sales_history.view_all_registers', 'sales_history.view_all_registers', 'Ver ventas de todas las cajas'),
  ('receivables.view', 'receivables.view', 'Ver deudas'),
  ('receivables.payment.register', 'receivables.payment.register', 'Registrar pago de deuda'),
  ('receivables.notes.view', 'receivables.notes.view', 'Ver notas sensibles de deuda'),
  ('products.view', 'products.view', 'Ver productos'),
  ('products.create_from_sourcing', 'products.create_from_sourcing', 'Crear productos desde sourcing'),
  ('products.update_price', 'products.update_price', 'Actualizar precios'),
  ('inventory.adjust_stock', 'inventory.adjust_stock', 'Ajustar stock'),
  ('inventory.bulk_import', 'inventory.bulk_import', 'Importar stock o productos en lote'),
  ('inventory.cost.view', 'inventory.cost.view', 'Ver costo de inventario'),
  ('inventory.value.view', 'inventory.value.view', 'Ver valorización de inventario'),
  ('reporting.operational.view', 'reporting.operational.view', 'Ver reportes operativos'),
  ('reporting.executive.view', 'reporting.executive.view', 'Ver reportes ejecutivos'),
  ('reporting.margin.view', 'reporting.margin.view', 'Ver margen'),
  ('reporting.credit_exposure.view', 'reporting.credit_exposure.view', 'Ver exposición de crédito'),
  ('sync.view', 'sync.view', 'Ver sincronización'),
  ('users.manage', 'users.manage', 'Gestionar usuarios'),
  ('roles.assign', 'roles.assign', 'Asignar roles'),
  ('audit.view', 'audit.view', 'Ver auditoría'),
  ('system.support.override', 'system.support.override', 'Usar override técnico')
on conflict (id) do update
set
  code = excluded.code,
  name = excluded.name;

insert into public.role_permission_assignments (id, role_id, permission_id)
values
  ('rpa_cashier_checkout', 'cashier', 'checkout.sale.create'),
  ('rpa_cashier_open', 'cashier', 'cash.session.open'),
  ('rpa_cashier_close', 'cashier', 'cash.session.close'),
  ('rpa_cashier_sales', 'cashier', 'sales_history.view'),
  ('rpa_cashier_sync', 'cashier', 'sync.view'),

  ('rpa_collections_view', 'collections_clerk', 'receivables.view'),
  ('rpa_collections_pay', 'collections_clerk', 'receivables.payment.register'),
  ('rpa_collections_notes', 'collections_clerk', 'receivables.notes.view'),

  ('rpa_supervisor_checkout', 'shift_supervisor', 'checkout.sale.create'),
  ('rpa_supervisor_open', 'shift_supervisor', 'cash.session.open'),
  ('rpa_supervisor_close', 'shift_supervisor', 'cash.session.close'),
  ('rpa_supervisor_manual_cash', 'shift_supervisor', 'cash.movement.manual.record'),
  ('rpa_supervisor_sales', 'shift_supervisor', 'sales_history.view'),
  ('rpa_supervisor_sales_all', 'shift_supervisor', 'sales_history.view_all_registers'),
  ('rpa_supervisor_receivables', 'shift_supervisor', 'receivables.view'),
  ('rpa_supervisor_receivables_pay', 'shift_supervisor', 'receivables.payment.register'),
  ('rpa_supervisor_sync', 'shift_supervisor', 'sync.view'),

  ('rpa_catalog_view', 'catalog_manager', 'products.view'),
  ('rpa_catalog_source', 'catalog_manager', 'products.create_from_sourcing'),
  ('rpa_catalog_prices', 'catalog_manager', 'products.update_price'),
  ('rpa_catalog_adjust', 'catalog_manager', 'inventory.adjust_stock'),
  ('rpa_catalog_bulk', 'catalog_manager', 'inventory.bulk_import'),
  ('rpa_catalog_cost', 'catalog_manager', 'inventory.cost.view'),
  ('rpa_catalog_value', 'catalog_manager', 'inventory.value.view'),

  ('rpa_manager_checkout', 'business_manager', 'checkout.sale.create'),
  ('rpa_manager_open', 'business_manager', 'cash.session.open'),
  ('rpa_manager_close', 'business_manager', 'cash.session.close'),
  ('rpa_manager_manual_cash', 'business_manager', 'cash.movement.manual.record'),
  ('rpa_manager_sales', 'business_manager', 'sales_history.view'),
  ('rpa_manager_sales_all', 'business_manager', 'sales_history.view_all_registers'),
  ('rpa_manager_receivables', 'business_manager', 'receivables.view'),
  ('rpa_manager_receivables_pay', 'business_manager', 'receivables.payment.register'),
  ('rpa_manager_receivables_notes', 'business_manager', 'receivables.notes.view'),
  ('rpa_manager_products', 'business_manager', 'products.view'),
  ('rpa_manager_source', 'business_manager', 'products.create_from_sourcing'),
  ('rpa_manager_prices', 'business_manager', 'products.update_price'),
  ('rpa_manager_adjust', 'business_manager', 'inventory.adjust_stock'),
  ('rpa_manager_bulk', 'business_manager', 'inventory.bulk_import'),
  ('rpa_manager_cost', 'business_manager', 'inventory.cost.view'),
  ('rpa_manager_value', 'business_manager', 'inventory.value.view'),
  ('rpa_manager_reporting_exec', 'business_manager', 'reporting.executive.view'),
  ('rpa_manager_reporting_margin', 'business_manager', 'reporting.margin.view'),
  ('rpa_manager_reporting_credit', 'business_manager', 'reporting.credit_exposure.view'),
  ('rpa_manager_sync', 'business_manager', 'sync.view'),

  ('rpa_exec_sales', 'executive_readonly', 'sales_history.view'),
  ('rpa_exec_sales_all', 'executive_readonly', 'sales_history.view_all_registers'),
  ('rpa_exec_receivables', 'executive_readonly', 'receivables.view'),
  ('rpa_exec_reporting', 'executive_readonly', 'reporting.executive.view'),
  ('rpa_exec_margin', 'executive_readonly', 'reporting.margin.view'),
  ('rpa_exec_credit', 'executive_readonly', 'reporting.credit_exposure.view'),
  ('rpa_exec_inventory', 'executive_readonly', 'inventory.value.view'),

  ('rpa_admin_users', 'system_admin', 'users.manage'),
  ('rpa_admin_roles', 'system_admin', 'roles.assign'),
  ('rpa_admin_audit', 'system_admin', 'audit.view'),
  ('rpa_admin_override', 'system_admin', 'system.support.override'),
  ('rpa_admin_sync', 'system_admin', 'sync.view'),

  ('rpa_service_sync', 'service_account', 'sync.view')
on conflict (id) do update
set
  role_id = excluded.role_id,
  permission_id = excluded.permission_id;
