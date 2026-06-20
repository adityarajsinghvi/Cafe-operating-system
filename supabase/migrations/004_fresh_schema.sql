-- ─────────────────────────────────────────────────────────────────────────────
-- PARCHA FRESH SCHEMA — Run in Supabase SQL editor
-- Drops all old tables (old Parcha used cafe_id, different names),
-- then creates everything the app actually needs.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── DROP OLD TABLES (safe — CASCADE handles FKs) ─────────────────────────────
DROP TABLE IF EXISTS order_items        CASCADE;
DROP TABLE IF EXISTS orders             CASCADE;
DROP TABLE IF EXISTS service_requests   CASCADE;
DROP TABLE IF EXISTS table_sessions     CASCADE;
DROP TABLE IF EXISTS customers          CASCADE;
DROP TABLE IF EXISTS restaurant_tables  CASCADE;
DROP TABLE IF EXISTS cafe_tables        CASCADE;
DROP TABLE IF EXISTS menu_items         CASCADE;
DROP TABLE IF EXISTS menu_categories    CASCADE;
DROP TABLE IF EXISTS menu_drafts        CASCADE;
DROP TABLE IF EXISTS menu_extraction_jobs CASCADE;
DROP TABLE IF EXISTS extraction_jobs    CASCADE;
DROP TABLE IF EXISTS menus              CASCADE;
DROP TABLE IF EXISTS restaurant_members CASCADE;
DROP TABLE IF EXISTS cafe_members       CASCADE;
DROP TABLE IF EXISTS restaurants        CASCADE;
DROP TABLE IF EXISTS cafes              CASCADE;

-- ── EXTENSIONS ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── RESTAURANTS ───────────────────────────────────────────────────────────────
CREATE TABLE restaurants (
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
CREATE INDEX restaurants_slug_idx ON restaurants (slug);

-- ── RESTAURANT MEMBERS ────────────────────────────────────────────────────────
CREATE TABLE restaurant_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','manager','staff')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);
CREATE INDEX restaurant_members_restaurant_idx ON restaurant_members (restaurant_id);
CREATE INDEX restaurant_members_user_idx       ON restaurant_members (user_id);

-- ── MENU EXTRACTION JOBS ──────────────────────────────────────────────────────
CREATE TABLE menu_extraction_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  source        text NOT NULL CHECK (source IN ('photo','pdf','url')),
  source_urls   text[] NOT NULL DEFAULT '{}',
  source_url    text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','failed')),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_extraction_jobs_restaurant_idx ON menu_extraction_jobs (restaurant_id);

-- ── MENU DRAFTS ───────────────────────────────────────────────────────────────
CREATE TABLE menu_drafts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  job_id        uuid REFERENCES menu_extraction_jobs(id) ON DELETE SET NULL,
  payload       jsonb NOT NULL DEFAULT '{}',
  summary       jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_drafts_restaurant_idx ON menu_drafts (restaurant_id);
CREATE INDEX menu_drafts_job_idx        ON menu_drafts (job_id);

-- ── MENU CATEGORIES ───────────────────────────────────────────────────────────
CREATE TABLE menu_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_categories_restaurant_idx ON menu_categories (restaurant_id);

-- ── MENU ITEMS ────────────────────────────────────────────────────────────────
CREATE TABLE menu_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id   uuid REFERENCES menu_categories(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  price_cents   int NOT NULL DEFAULT 0,
  image_url     text,
  dietary_type  text NOT NULL DEFAULT 'unknown'
                  CHECK (dietary_type IN ('veg','non_veg','egg','vegan','unknown')),
  is_available  boolean NOT NULL DEFAULT true,
  is_popular    boolean NOT NULL DEFAULT false,
  is_special    boolean NOT NULL DEFAULT false,
  sort_order    int NOT NULL DEFAULT 0,
  tags          text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_items_restaurant_idx ON menu_items (restaurant_id);
CREATE INDEX menu_items_category_idx   ON menu_items (category_id);

-- ── RESTAURANT TABLES ─────────────────────────────────────────────────────────
CREATE TABLE restaurant_tables (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label         text NOT NULL,
  zone          text,
  qr_token      text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, label)
);
CREATE INDEX restaurant_tables_restaurant_idx ON restaurant_tables (restaurant_id);
CREATE INDEX restaurant_tables_qr_token_idx   ON restaurant_tables (qr_token);

-- ── CUSTOMERS ─────────────────────────────────────────────────────────────────
CREATE TABLE customers (
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
CREATE INDEX customers_restaurant_idx ON customers (restaurant_id);
CREATE INDEX customers_phone_idx      ON customers (restaurant_id, phone);

-- ── TABLE SESSIONS ────────────────────────────────────────────────────────────
CREATE TABLE table_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id            uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  customer_id         uuid REFERENCES customers(id) ON DELETE SET NULL,
  session_token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at          timestamptz NOT NULL,
  bill_payment_status text DEFAULT 'unpaid' CHECK (bill_payment_status IN ('unpaid','paid')),
  bill_paid_at        timestamptz,
  closed_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX table_sessions_restaurant_idx ON table_sessions (restaurant_id);
CREATE INDEX table_sessions_token_idx      ON table_sessions (session_token);

-- ── ORDERS ────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
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
CREATE INDEX orders_restaurant_idx ON orders (restaurant_id);
CREATE INDEX orders_session_idx    ON orders (table_session_id);
CREATE INDEX orders_customer_idx   ON orders (customer_id);
CREATE INDEX orders_created_idx    ON orders (restaurant_id, created_at DESC);
CREATE INDEX orders_status_idx     ON orders (restaurant_id, status);

-- ── ORDER ITEMS ───────────────────────────────────────────────────────────────
CREATE TABLE order_items (
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
CREATE INDEX order_items_order_idx ON order_items (order_id);

-- ── SERVICE REQUESTS ──────────────────────────────────────────────────────────
CREATE TABLE service_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_session_id uuid REFERENCES table_sessions(id) ON DELETE SET NULL,
  request_type     text NOT NULL CHECK (request_type IN ('waiter','water')),
  status           text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','acknowledged','resolved')),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_requests_restaurant_idx ON service_requests (restaurant_id);

-- ── UPDATED_AT TRIGGERS ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at      BEFORE UPDATE ON restaurants           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER menu_extraction_jobs_upd_at BEFORE UPDATE ON menu_extraction_jobs  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER menu_drafts_updated_at      BEFORE UPDATE ON menu_drafts           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER menu_items_updated_at       BEFORE UPDATE ON menu_items            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated_at           BEFORE UPDATE ON orders                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_updated_at        BEFORE UPDATE ON customers             FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
ALTER TABLE restaurants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_extraction_jobs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_drafts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests      ENABLE ROW LEVEL SECURITY;

-- Anon: read public menu data
CREATE POLICY anon_read_restaurants     ON restaurants     FOR SELECT TO anon USING (status = 'active' AND onboarding_completed = true);
CREATE POLICY anon_read_menu_categories ON menu_categories FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_menu_items      ON menu_items      FOR SELECT TO anon USING (true);

-- Authenticated owners: full access via restaurant membership
CREATE POLICY auth_all_restaurants ON restaurants FOR ALL TO authenticated
  USING (id IN (SELECT restaurant_id FROM restaurant_members WHERE user_id = auth.uid()));
CREATE POLICY auth_all_members ON restaurant_members FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ── STORAGE BUCKETS ───────────────────────────────────────────────────────────
-- menu-uploads: private bucket for AI extraction source files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-uploads',
  'menu-uploads',
  false,
  20971520,  -- 20 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- menu-images: public bucket for published menu item photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880,   -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can manage their own uploads
CREATE POLICY "auth upload menu files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('menu-uploads','menu-images'));

CREATE POLICY "auth read own uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('menu-uploads','menu-images'));

CREATE POLICY "auth delete own uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('menu-uploads','menu-images'));

-- Public read for menu-images (item photos shown to guests)
CREATE POLICY "anon read menu images" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'menu-images');
