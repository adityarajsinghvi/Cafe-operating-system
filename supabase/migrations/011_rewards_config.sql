-- Rewards program config on restaurants
ALTER TABLE restaurants
  ADD COLUMN rewards_enabled     boolean NOT NULL DEFAULT false,
  ADD COLUMN reward_title        text    NOT NULL DEFAULT 'Free Drink',
  ADD COLUMN reward_description  text;
