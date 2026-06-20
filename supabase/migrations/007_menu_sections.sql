-- Menu sections: owner-defined top-level groupings (e.g. "Drinks", "Food", "Specials")
CREATE TABLE menu_sections (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  emoji         text,
  description   text,
  sort_order    integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_sections_restaurant ON menu_sections(restaurant_id);

-- Link menu items to a section (null = uncategorised, shows under "All")
ALTER TABLE menu_items
  ADD COLUMN section_id uuid REFERENCES menu_sections(id) ON DELETE SET NULL;

CREATE INDEX idx_menu_items_section ON menu_items(section_id);

-- RLS: owners can only see/modify their own restaurant's sections
ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_sections" ON menu_sections
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_members WHERE user_id = auth.uid()
    )
  );

-- Guests read active sections for a restaurant (used by guest menu API)
CREATE POLICY "guest_read_active_sections" ON menu_sections
  FOR SELECT
  USING (is_active = true);
