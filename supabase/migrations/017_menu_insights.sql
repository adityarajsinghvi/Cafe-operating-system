-- AI-generated menu insights ("this item isn't earning its menu space"),
-- cached per restaurant so the LLM is called on a TTL, not on every dashboard view.
ALTER TABLE restaurants
  ADD COLUMN cached_menu_insights jsonb,
  ADD COLUMN menu_insights_refreshed_at timestamptz,
  ADD COLUMN menu_insights_served_order_count int NOT NULL DEFAULT 0;
