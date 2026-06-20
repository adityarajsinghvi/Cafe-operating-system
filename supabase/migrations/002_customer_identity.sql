-- Customer identity for guest ordering
-- Scoped per restaurant so the same phone can be a different customer profile
-- at each cafe (different name, preferences, visit history)

CREATE TABLE customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone         text NOT NULL,
  name          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_restaurant_phone_unique UNIQUE (restaurant_id, phone)
);

CREATE INDEX customers_restaurant_id_idx ON customers (restaurant_id);

-- Link orders to a customer (nullable — all existing rows unaffected)
ALTER TABLE orders
  ADD COLUMN customer_id uuid REFERENCES customers(id);

-- Link sessions to a customer for per-visit context
ALTER TABLE table_sessions
  ADD COLUMN customer_id uuid REFERENCES customers(id);
