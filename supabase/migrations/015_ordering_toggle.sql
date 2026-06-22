-- Lets an owner turn off table ordering from Settings (read-only digital menu mode).
-- Loyalty/rewards already has a kill-switch (rewards_enabled from 011_rewards_config.sql);
-- this adds the equivalent for the ordering system.
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS ordering_enabled boolean NOT NULL DEFAULT true;
