-- Fix ordering_enabled: was DEFAULT true (wrong — menu-plan restaurants got ordering).
-- New restaurants default to false; the app sets it explicitly on create based on plan.
ALTER TABLE restaurants
  ALTER COLUMN ordering_enabled SET DEFAULT false;

-- Back-fill: menu-plan restaurants should never have ordering enabled.
UPDATE restaurants
  SET ordering_enabled = false
  WHERE plan = 'menu';
