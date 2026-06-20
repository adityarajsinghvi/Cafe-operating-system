-- Track how many times a customer has redeemed a reward
ALTER TABLE customers
  ADD COLUMN redemptions_count int NOT NULL DEFAULT 0;

-- Atomic redemption: subtract threshold, increment redemptions_count
-- Safe to call multiple times: no-ops if points < threshold
CREATE OR REPLACE FUNCTION redeem_customer_reward(
  p_customer_id uuid,
  p_threshold   int
) RETURNS int   -- returns remaining points after deduction
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points int;
  v_remaining      int;
BEGIN
  SELECT loyalty_points INTO v_current_points
  FROM customers WHERE id = p_customer_id FOR UPDATE;

  IF v_current_points < p_threshold THEN
    RETURN v_current_points;  -- not enough points, no-op
  END IF;

  v_remaining := v_current_points - p_threshold;

  UPDATE customers
  SET
    loyalty_points     = v_remaining,
    redemptions_count  = redemptions_count + 1
  WHERE id = p_customer_id;

  RETURN v_remaining;
END;
$$;
