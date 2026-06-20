-- ── LOYALTY PER-VISIT GUARDS ──────────────────────────────────────────────────
-- Points + visit_count: once per session (loyalty_session_credited)
-- Spend + taste_profile: once per order   (spend_credited)

ALTER TABLE table_sessions
  ADD COLUMN loyalty_session_credited boolean NOT NULL DEFAULT false;

ALTER TABLE orders
  ADD COLUMN spend_credited boolean NOT NULL DEFAULT false;

-- Drop the old per-order function from migration 008
DROP FUNCTION IF EXISTS award_order_loyalty(uuid, int, int, text[]);

-- New function: called when an order is marked "served"
-- Idempotent: safe to call multiple times for the same order.
CREATE OR REPLACE FUNCTION serve_order_loyalty(
  p_order_id    uuid,
  p_customer_id uuid,
  p_session_id  uuid,
  p_order_cents int,
  p_points      int,   -- restaurant's loyalty_points_per_order (used only on first served order per session)
  p_item_names  text[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_credited  boolean;
  v_session_done      boolean;
  v_existing_items    text[];
  v_merged_items      text[];
  v_new_total         int;
  v_new_count         int;
BEGIN
  -- Guard 1: has this order's spend already been credited?
  SELECT spend_credited INTO v_already_credited
  FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_already_credited THEN
    RETURN;  -- fully idempotent — nothing to do
  END IF;

  -- Mark spend as credited immediately to prevent race conditions
  UPDATE orders SET spend_credited = true WHERE id = p_order_id;

  -- Credit spend to customer
  UPDATE customers
  SET total_spent = total_spent + p_order_cents
  WHERE id = p_customer_id
  RETURNING total_spent, visit_count INTO v_new_total, v_new_count;

  -- Update taste_profile with this order's items
  SELECT COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(taste_profile -> 'top_items')),
    '{}'::text[]
  ) INTO v_existing_items
  FROM customers WHERE id = p_customer_id;

  SELECT ARRAY(
    SELECT DISTINCT val FROM unnest(p_item_names || v_existing_items) AS val LIMIT 5
  ) INTO v_merged_items;

  UPDATE customers
  SET taste_profile = jsonb_build_object(
    'top_items', to_jsonb(v_merged_items),
    'avg_spend',  CASE WHEN v_new_count > 0 THEN v_new_total / v_new_count ELSE 0 END
  )
  WHERE id = p_customer_id;

  -- Guard 2: have points + visit already been credited for this session?
  SELECT loyalty_session_credited INTO v_session_done
  FROM table_sessions WHERE id = p_session_id FOR UPDATE;

  IF NOT v_session_done THEN
    -- First served order in this session → award points + count the visit
    UPDATE customers
    SET
      loyalty_points = loyalty_points + p_points,
      visit_count    = visit_count + 1,
      last_visit_at  = now()
    WHERE id = p_customer_id;

    UPDATE table_sessions
    SET loyalty_session_credited = true
    WHERE id = p_session_id;
  END IF;
  -- If session already credited → skip points and visit_count silently
END;
$$;
