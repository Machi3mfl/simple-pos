-- Core schema for simple-pos real-backend release gate (Iteration 6)

create table if not exists products (
  id text primary key,
  name text not null,
  category_id text not null,
  price numeric(12, 4) not null check (price > 0),
  cost numeric(12, 4),
  stock integer not null default 0 check (stock >= 0),
  image_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists inventory_items (
  product_id text primary key references products(id) on delete cascade,
  stock_on_hand numeric(14, 4) not null check (stock_on_hand >= 0),
  weighted_average_unit_cost numeric(14, 4) not null check (weighted_average_unit_cost >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  movement_type text not null check (movement_type in ('inbound', 'outbound', 'adjustment')),
  quantity numeric(14, 4) not null check (quantity > 0),
  unit_cost numeric(14, 4) not null check (unit_cost > 0),
  occurred_at timestamptz not null,
  stock_on_hand_after numeric(14, 4) not null check (stock_on_hand_after >= 0),
  weighted_average_unit_cost_after numeric(14, 4) not null check (weighted_average_unit_cost_after >= 0),
  inventory_value_after numeric(16, 4) not null check (inventory_value_after >= 0),
  reason text
);

create index if not exists idx_stock_movements_product_occurred_at
  on stock_movements (product_id, occurred_at desc);

create table if not exists sales (
  id text primary key,
  payment_method text not null check (payment_method in ('cash', 'on_account')),
  customer_id text,
  created_at timestamptz not null
);

create table if not exists sale_items (
  sale_id text not null references sales(id) on delete cascade,
  product_id text not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  primary key (sale_id, product_id)
);

create index if not exists idx_sales_created_at on sales (created_at desc);
create index if not exists idx_sales_payment_method_created_at on sales (payment_method, created_at desc);
