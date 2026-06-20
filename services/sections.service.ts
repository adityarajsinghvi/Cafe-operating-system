import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface MenuSection {
  id: string;
  restaurantId: string;
  name: string;
  emoji: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface SectionRow {
  id: string;
  restaurant_id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

function mapSection(row: SectionRow): MenuSection {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    emoji: row.emoji,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function listSections(restaurantId: string): Promise<MenuSection[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("menu_sections")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true }) as { data: SectionRow[] | null };

  return (data ?? []).map(mapSection);
}

export async function listActiveSections(restaurantId: string): Promise<MenuSection[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("menu_sections")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true }) as { data: SectionRow[] | null };

  return (data ?? []).map(mapSection);
}

export async function createSection(
  restaurantId: string,
  payload: { name: string; emoji?: string; description?: string },
): Promise<MenuSection | null> {
  const supabase = await createClient();

  // Determine next sort_order
  const { data: existing } = await (supabase as any)
    .from("menu_sections")
    .select("sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: false })
    .limit(1) as { data: { sort_order: number }[] | null };

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await (supabase as any)
    .from("menu_sections")
    .insert({
      restaurant_id: restaurantId,
      name: payload.name.trim(),
      emoji: payload.emoji?.trim() || null,
      description: payload.description?.trim() || null,
      sort_order: nextOrder,
    })
    .select("*")
    .single() as { data: SectionRow | null; error: unknown };

  if (error) return null;
  return data ? mapSection(data) : null;
}

export async function updateSection(
  sectionId: string,
  payload: Partial<{ name: string; emoji: string; description: string; isActive: boolean; sortOrder: number }>,
): Promise<MenuSection | null> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.emoji !== undefined) updates.emoji = payload.emoji.trim() || null;
  if (payload.description !== undefined) updates.description = payload.description.trim() || null;
  if (payload.isActive !== undefined) updates.is_active = payload.isActive;
  if (payload.sortOrder !== undefined) updates.sort_order = payload.sortOrder;

  const { data, error } = await (supabase as any)
    .from("menu_sections")
    .update(updates)
    .eq("id", sectionId)
    .select("*")
    .single() as { data: SectionRow | null; error: unknown };

  if (error) return null;
  return data ? mapSection(data) : null;
}

export async function deleteSection(sectionId: string): Promise<boolean> {
  const supabase = await createClient();
  // menu_items.section_id is SET NULL on delete, so items are preserved
  const { error } = await (supabase as any)
    .from("menu_sections")
    .delete()
    .eq("id", sectionId);

  return !error;
}

/** Bulk-assign section_id to menu items by their IDs (used during publish) */
export async function assignSectionToItems(
  itemIds: string[],
  sectionId: string | null,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin || !itemIds.length) return false;

  const { error } = await (admin as any)
    .from("menu_items")
    .update({ section_id: sectionId })
    .in("id", itemIds);

  return !error;
}

/** Get all sections for a restaurant with item counts — used in owner dashboard */
export async function listSectionsWithCounts(
  restaurantId: string,
): Promise<(MenuSection & { itemCount: number })[]> {
  const supabase = await createClient();

  const { data: sections } = await (supabase as any)
    .from("menu_sections")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true }) as { data: SectionRow[] | null };

  if (!sections || sections.length === 0) return [];

  // Count items per section
  const { data: counts } = await (supabase as any)
    .from("menu_items")
    .select("section_id")
    .in("section_id", sections.map((s) => s.id)) as {
    data: { section_id: string }[] | null;
  };

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    countMap[row.section_id] = (countMap[row.section_id] ?? 0) + 1;
  }

  return sections.map((s) => ({
    ...mapSection(s),
    itemCount: countMap[s.id] ?? 0,
  }));
}
