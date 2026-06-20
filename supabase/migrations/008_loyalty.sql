-- ── LOYALTY LAYER ─────────────────────────────────────────────────────────────

-- 1. Add loyalty_points + taste_profile to customers
ALTER TABLE customers
  ADD COLUMN loyalty_points int  NOT NULL DEFAULT 0,
  ADD COLUMN taste_profile  jsonb;

-- 2. Add per-restaurant loyalty config to restaurants
ALTER TABLE restaurants
  ADD COLUMN loyalty_points_per_order     int NOT NULL DEFAULT 10,
  ADD COLUMN loyalty_redemption_threshold int NOT NULL DEFAULT 100;

-- 3. Atomic function: award points + update total_spent + rebuild taste_profile
--    Called by the app on every order placement when a customer_id is known.
CREATE OR REPLACE FUNCTION award_order_loyalty(
  p_customer_id uuid,
  p_order_cents int,
  p_points      int,
  p_item_names  text[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_items text[];
  v_merged_items   text[];
  v_new_total      int;
  v_new_count      int;
BEGIN
  -- Award points and accumulate spend
  UPDATE customers
  SET
    loyalty_points = loyalty_points + p_points,
    total_spent    = total_spent + p_order_cents
  WHERE id = p_customer_id
  RETURNING total_spent, visit_count
  INTO v_new_total, v_new_count;

  -- Pull existing top_items (may be null on first order)
  SELECT COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(taste_profile -> 'top_items')),
    '{}'::text[]
  )
  INTO v_existing_items
  FROM customers
  WHERE id = p_customer_id;

  -- Merge new names in front, keep first 5 unique values
  SELECT ARRAY(
    SELECT DISTINCT val
    FROM unnest(p_item_names || v_existing_items) AS val
    LIMIT 5
  )
  INTO v_merged_items;

  -- Write updated taste profile
  UPDATE customers
  SET taste_profile = jsonb_build_object(
    'top_items', to_jsonb(v_merged_items),
    'avg_spend',  CASE WHEN v_new_count > 0 THEN v_new_total / v_new_count ELSE 0 END
  )
  WHERE id = p_customer_id;
END;
$$;
