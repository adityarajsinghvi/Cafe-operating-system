-- Move smart-suggestion generation from per-guest-request to a shared,
-- restaurant-level cache refreshed on a schedule (see /api/cron/refresh-suggestions).
ALTER TABLE restaurants
  ADD COLUMN cached_suggestion jsonb,
  ADD COLUMN cached_weather jsonb,
  ADD COLUMN suggestion_refreshed_at timestamptz;
