-- ─────────────────────────────────────────────
-- PARCHA — Initial Schema
-- Run this in Supabase SQL editor
-- ─────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── ENUMS ──────────────────────────────────────
create type plan_type as enum ('free', 'starter', 'growth', 'pro');
create type order_status as enum ('pending', 'preparing', 'ready', 'completed', 'cancelled');
create type payment_status as enum ('unpaid', 'paid', 'refunded');
create type campaign_type as enum ('winback', 'birthday', 'promo', 'loyalty');
create type campaign_status as enum ('draft', 'approved', 'sent');

-- ── USERS (cafe owners) ────────────────────────
create table users (
  id            uuid primary key default uuid_generate_v4(),
  clerk_id      text unique not null,
  email         text unique not null,
  name          text,
  phone         text,
  created_at    timestamptz default now()
);

-- ── CAFES ──────────────────────────────────────
create table cafes (
  id                uuid primary key default uuid_generate_v4(),
  owner_id          uuid not null references users(id) on delete cascade,
  name              text not null,
  slug              text unique not null,
  description       text,
  city              text not null,
  address           text,
  logo_url          text,
  plan              plan_type default 'free',
  razorpay_sub_id   text,
  settings          jsonb default '{
    "moment_engine": true,
    "loyalty_enabled": true,
    "feedback_enabled": true,
    "winback_days": 21,
    "points_per_order": 10,
    "points_to_redeem": 100
  }',
  is_active         boolean default true,
  created_at        timestamptz default now()
);

create index idx_cafes_owner on cafes(owner_id);
create index idx_cafes_slug on cafes(slug);

-- ── MENU CATEGORIES ────────────────────────────
create table menu_categories (
  id          uuid primary key default uuid_generate_v4(),
  cafe_id     uuid not null references cafes(id) on delete cascade,
  name        text not null,
  sort_order  int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create index idx_menu_categories_cafe on menu_categories(cafe_id);

-- ── MENU ITEMS ─────────────────────────────────
create table menu_items (
  id            uuid primary key default uuid_generate_v4(),
  cafe_id       uuid not null references cafes(id) on delete cascade,
  category_id   uuid references menu_categories(id) on delete set null,
  name          text not null,
  description   text,
  price         numeric(10,2) not null,
  image_url     text,
  is_available  boolean default true,
  is_veg        boolean default true,
  tags          text[] default '{}',
  sort_order    int default 0,
  view_count    int default 0,
  order_count   int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_menu_items_cafe on menu_items(cafe_id);
create index idx_menu_items_category on menu_items(category_id);

-- ── CAFE TABLES ────────────────────────────────
create table cafe_tables (
  id              uuid primary key default uuid_generate_v4(),
  cafe_id         uuid not null references cafes(id) on delete cascade,
  table_number    text not null,
  qr_code_url     text,
  is_active       boolean default true,
  reorder_rate    numeric(5,2) default 0,
  created_at      timestamptz default now(),
  unique(cafe_id, table_number)
);

create index idx_cafe_tables_cafe on cafe_tables(cafe_id);

-- ── CUSTOMERS ──────────────────────────────────
create table customers (
  id              uuid primary key default uuid_generate_v4(),
  cafe_id         uuid not null references cafes(id) on delete cascade,
  phone           text not null,
  name            text,
  email           text,
  birthday        date,
  loyalty_points  int default 0,
  visit_count     int default 0,
  total_spent     numeric(10,2) default 0,
  last_visit_at   timestamptz,
  taste_profile   jsonb default '{
    "top_items": [],
    "preferred_time": null,
    "is_veg": null,
    "avg_spend": 0
  }',
  winback_sent_at timestamptz,
  created_at      timestamptz default now(),
  unique(cafe_id, phone)
);

create index idx_customers_cafe on customers(cafe_id);
create index idx_customers_phone on customers(phone);
create index idx_customers_last_visit on customers(cafe_id, last_visit_at);

-- ── ORDERS ─────────────────────────────────────
create table orders (
  id                  uuid primary key default uuid_generate_v4(),
  cafe_id             uuid not null references cafes(id) on delete cascade,
  customer_id         uuid references customers(id) on delete set null,
  table_id            uuid references cafe_tables(id) on delete set null,
  status              order_status default 'pending',
  total_amount        numeric(10,2) not null,
  payment_status      payment_status default 'unpaid',
  razorpay_order_id   text,
  razorpay_payment_id text,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index idx_orders_cafe on orders(cafe_id);
create index idx_orders_customer on orders(customer_id);
create index idx_orders_created on orders(cafe_id, created_at desc);
create index idx_orders_status on orders(cafe_id, status);

-- ── ORDER ITEMS ────────────────────────────────
create table order_items (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references orders(id) on delete cascade,
  menu_item_id    uuid references menu_items(id) on delete set null,
  name            text not null,
  quantity        int not null default 1,
  unit_price      numeric(10,2) not null,
  customisation   text,
  created_at      timestamptz default now()
);

create index idx_order_items_order on order_items(order_id);

-- ── FEEDBACK ───────────────────────────────────
create table feedback (
  id            uuid primary key default uuid_generate_v4(),
  cafe_id       uuid not null references cafes(id) on delete cascade,
  order_id      uuid references orders(id) on delete set null,
  customer_id   uuid references customers(id) on delete set null,
  rating        int not null check (rating between 1 and 3),
  comment       text,
  is_resolved   boolean default false,
  created_at    timestamptz default now()
);

create index idx_feedback_cafe on feedback(cafe_id);
create index idx_feedback_rating on feedback(cafe_id, rating);

-- ── CAMPAIGNS ──────────────────────────────────
create table campaigns (
  id          uuid primary key default uuid_generate_v4(),
  cafe_id     uuid not null references cafes(id) on delete cascade,
  type        campaign_type not null,
  subject     text not null,
  body        text not null,
  status      campaign_status default 'draft',
  sent_count  int default 0,
  sent_at     timestamptz,
  created_at  timestamptz default now()
);

create index idx_campaigns_cafe on campaigns(cafe_id);

-- ── UPDATED_AT TRIGGER ─────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger menu_items_updated_at
  before update on menu_items
  for each row execute function update_updated_at();

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- ── ROW LEVEL SECURITY ─────────────────────────
alter table cafes enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table cafe_tables enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table feedback enable row level security;
alter table campaigns enable row level security;

-- Owners can only see their own cafe data
create policy "owners_own_cafes" on cafes
  for all using (owner_id = (
    select id from users where clerk_id = auth.jwt() ->> 'sub'
  ));

-- Service role bypasses RLS (for API routes)
-- All other tables inherit cafe-level access via service role key
