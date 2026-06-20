-- Atomic visit counter increment for customers
CREATE OR REPLACE FUNCTION increment_customer_visit(p_customer_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE customers
  SET
    visit_count   = visit_count + 1,
    last_visit_at = now()
  WHERE id = p_customer_id;
$$;
