-- ─────────────────────────────────────────────────────────────────────────────
-- PARCHA APP SCHEMA — Run in Supabase SQL editor
-- Creates all tables the Parcha app needs.
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── RESTAURANTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurants (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  slug                 text UNIQUE NOT NULL,
  description          text,
  logo_url             text,
  cover_image_url      text,
  currency             text NOT NULL DEFAULT 'INR',
  primary_color        text,
  status               text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS restaurants_slug_idx ON restaurants (slug);

-- Add missing columns to existing table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='logo_url') THEN
    ALTER TABLE restaurants ADD COLUMN logo_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='cover_image_url') THEN
    ALTER TABLE restaurants ADD COLUMN cover_image_url text;
  END IF;
END $$;

-- ── RESTAURANT MEMBERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','manager','staff')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);
CREATE INDEX IF NOT EXISTS restaurant_members_restaurant_idx ON restaurant_members (restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_members_user_idx ON restaurant_members (user_id);

-- ── MENUS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menus (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  draft_payload     jsonb,
  extraction_job_id text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, status)
);
CREATE INDEX IF NOT EXISTS menus_restaurant_idx ON menus (restaurant_id);

-- ── MENU CATEGORIES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_id       uuid REFERENCES menus(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_categories_restaurant_idx ON menu_categories (restaurant_id);
CREATE INDEX IF NOT EXISTS menu_categories_menu_idx ON menu_categories (menu_id);

-- Add missing columns to existing table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_categories' AND column_name='description') THEN
    ALTER TABLE menu_categories ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_categories' AND column_name='is_active') THEN
    ALTER TABLE menu_categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ── MENU ITEMS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id    uuid REFERENCES menu_categories(id) ON DELETE SET NULL,
  name           text NOT NULL,
  description    text,
  price_cents    int NOT NULL DEFAULT 0,
  image_url      text,
  dietary_type   text NOT NULL DEFAULT 'unknown'
                   CHECK (dietary_type IN ('veg','non_veg','egg','vegan','unknown')),
  is_available   boolean NOT NULL DEFAULT true,
  is_popular     boolean NOT NULL DEFAULT false,
  is_special     boolean NOT NULL DEFAULT false,
  sort_order     int NOT NULL DEFAULT 0,
  tags           text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_items_restaurant_idx ON menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items (category_id);

-- Add tags column to existing table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='tags') THEN
    ALTER TABLE menu_items ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- ── EXTRACTION JOBS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extraction_jobs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','done','error')),
  source         text NOT NULL CHECK (source IN ('photo','pdf','url')),
  result_payload jsonb,
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS extraction_jobs_restaurant_idx ON extraction_jobs (restaurant_id);

-- ── RESTAURANT TABLES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label         text NOT NULL,
  zone          text,
  qr_token      text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, label)
);
CREATE INDEX IF NOT EXISTS restaurant_tables_restaurant_idx ON restaurant_tables (restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_tables_qr_token_idx ON restaurant_tables (qr_token);

-- ── CUSTOMERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone         text NOT NULL,
  name          text,
  visit_count   int NOT NULL DEFAULT 0,
  total_spent   int NOT NULL DEFAULT 0,
  last_visit_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, phone)
);
CREATE INDEX IF NOT EXISTS customers_restaurant_idx ON customers (restaurant_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (restaurant_id, phone);

-- ── TABLE SESSIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS table_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id            uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  customer_id         uuid,
  session_token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at          timestamptz NOT NULL,
  bill_payment_status text DEFAULT 'unpaid' CHECK (bill_payment_status IN ('unpaid','paid')),
  bill_paid_at        timestamptz,
  closed_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS table_sessions_restaurant_idx ON table_sessions (restaurant_id);
CREATE INDEX IF NOT EXISTS table_sessions_token_idx ON table_sessions (session_token);

-- FK from table_sessions → customers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'table_sessions_customer_id_fkey'
  ) THEN
    ALTER TABLE table_sessions
      ADD CONSTRAINT table_sessions_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── ORDERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_session_id uuid REFERENCES table_sessions(id) ON DELETE SET NULL,
  customer_id      uuid REFERENCES customers(id) ON DELETE SET NULL,
  table_label      text,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','preparing','ready','served','cancelled')),
  notes            text,
  subtotal_cents   int NOT NULL DEFAULT 0,
  item_count       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_restaurant_idx ON orders (restaurant_id);
CREATE INDEX IF NOT EXISTS orders_session_idx ON orders (table_session_id);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (restaurant_id, status);

-- ── ORDER ITEMS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  name         text NOT NULL,
  price_cents  int NOT NULL,
  quantity     int NOT NULL DEFAULT 1,
  dietary_type text NOT NULL DEFAULT 'unknown',
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

-- ── SERVICE REQUESTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_session_id uuid REFERENCES table_sessions(id) ON DELETE SET NULL,
  request_type     text NOT NULL CHECK (request_type IN ('waiter','water')),
  status           text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','acknowledged','resolved')),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_requests_restaurant_idx ON service_requests (restaurant_id);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'restaurants_updated_at') THEN
    CREATE TRIGGER restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'menus_updated_at') THEN
    CREATE TRIGGER menus_updated_at BEFORE UPDATE ON menus FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'menu_items_updated_at2') THEN
    CREATE TRIGGER menu_items_updated_at2 BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orders_updated_at2') THEN
    CREATE TRIGGER orders_updated_at2 BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'customers_updated_at') THEN
    CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- Allow service role (admin client) unrestricted access.
-- Anon/authenticated access is read-only on public guest data.

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- Guest (anon) can read published restaurant + menu data:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon_read_restaurants') THEN
    CREATE POLICY anon_read_restaurants ON restaurants FOR SELECT TO anon USING (status = 'active' AND onboarding_completed = true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon_read_menu_categories') THEN
    CREATE POLICY anon_read_menu_categories ON menu_categories FOR SELECT TO anon USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anon_read_menu_items') THEN
    CREATE POLICY anon_read_menu_items ON menu_items FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Authenticated users (owners) can manage their own restaurant data:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='auth_all_restaurants') THEN
    CREATE POLICY auth_all_restaurants ON restaurants FOR ALL TO authenticated USING (
      id IN (SELECT restaurant_id FROM restaurant_members WHERE user_id = auth.uid())
    );
  END IF;
END $$;
