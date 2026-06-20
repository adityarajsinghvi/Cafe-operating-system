-- Smart suggestions toggle + city for weather
ALTER TABLE restaurants
  ADD COLUMN smart_suggestions_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN city text;
