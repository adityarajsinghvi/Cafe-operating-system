-- Simplify the order lifecycle to pending -> confirmed -> served (+ cancelled).
-- Drop the "preparing" and "ready" intermediate stages.
UPDATE orders SET status = 'confirmed' WHERE status = 'preparing';
UPDATE orders SET status = 'served' WHERE status = 'ready';

ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','confirmed','served','cancelled'));
