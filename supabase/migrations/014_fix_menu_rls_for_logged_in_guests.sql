-- restaurants/menu_categories/menu_items SELECT policies for public guest
-- browsing only granted to the "anon" role, so any logged-in user (an
-- owner previewing their own page, or a returning customer with a loyalty
-- account) hit RLS and saw an empty/missing menu, since their requests run
-- as "authenticated" instead of "anon". Widen the public-read policies to
-- cover both roles.
DROP POLICY IF EXISTS anon_read_restaurants ON restaurants;
DROP POLICY IF EXISTS anon_read_menu_categories ON menu_categories;
DROP POLICY IF EXISTS anon_read_menu_items ON menu_items;

CREATE POLICY public_read_restaurants ON restaurants
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND onboarding_completed = true);
CREATE POLICY public_read_menu_categories ON menu_categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_menu_items ON menu_items
  FOR SELECT TO anon, authenticated USING (true);
