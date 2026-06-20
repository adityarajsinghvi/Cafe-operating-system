import { createClient } from "@/lib/supabase/server";
import type {
  GuestMenu,
  GuestMenuCategory,
  GuestMenuItem,
  GuestMenuSection,
  GuestMenuStatus,
  GuestRestaurant,
} from "@/types/guest";
import type { DietaryType } from "@/types/menu";

function mapRestaurant(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string;
  currency: string;
}): GuestRestaurant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    logoUrl: row.logo_url,
    coverImageUrl: row.cover_image_url,
    primaryColor: row.primary_color,
    currency: row.currency,
  };
}

function mapMenuItem(row: {
  id: string;
  category_id: string;
  section_id?: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  dietary_type: DietaryType;
  is_popular: boolean;
  is_special: boolean;
  tags: string[] | null;
}): GuestMenuItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    sectionId: row.section_id ?? null,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    imageUrl: row.image_url,
    dietaryType: row.dietary_type,
    isPopular: row.is_popular,
    isSpecial: row.is_special,
    tags: row.tags ?? [],
  };
}

export async function getGuestMenuBySlug(
  slug: string,
): Promise<GuestMenu | null> {
  const supabase = await createClient();

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select(
      "id, slug, name, description, logo_url, cover_image_url, primary_color, currency",
    )
    .eq("slug", slug)
    .eq("onboarding_completed", true)
    .neq("status", "suspended")
    .maybeSingle();

  if (restaurantError || !restaurant) {
    return null;
  }

  const [{ data: categories }, { data: allItems }, { count: availableCount }, { data: rawSections }] =
    await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, description, sort_order")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      (supabase as any)
        .from("menu_items")
        .select(
          "id, category_id, section_id, name, description, price_cents, image_url, dietary_type, is_popular, is_special, sort_order, is_available, tags",
        )
        .eq("restaurant_id", restaurant.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .eq("is_available", true),
      (supabase as any)
        .from("menu_sections")
        .select("id, name, emoji, sort_order")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  const sections: GuestMenuSection[] = (rawSections ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    emoji: s.emoji ?? null,
    sortOrder: s.sort_order,
  }));

  const mappedRestaurant = mapRestaurant(restaurant);

  if (!categories?.length || !allItems?.length) {
    return {
      restaurant: mappedRestaurant,
      sections,
      categories: [],
      popularItems: [],
      specialItems: [],
      status: "coming_soon",
    };
  }

  if (!availableCount) {
    return {
      restaurant: mappedRestaurant,
      sections,
      categories: [],
      popularItems: [],
      specialItems: [],
      status: "all_unavailable",
    };
  }

  const availableItems = (allItems as any[]).filter((item) => item.is_available);
  const itemsByCategory = new Map<string, GuestMenuItem[]>();

  for (const item of availableItems) {
    const mapped = mapMenuItem(item);
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(mapped);
    itemsByCategory.set(item.category_id, list);
  }

  // Derive sectionId per category from first available item's section_id
  const sectionIdByCategory = new Map<string, string | null>();
  for (const item of availableItems) {
    if (!sectionIdByCategory.has(item.category_id)) {
      sectionIdByCategory.set(item.category_id, item.section_id ?? null);
    }
  }

  const menuCategories: GuestMenuCategory[] = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      sortOrder: category.sort_order,
      sectionId: sectionIdByCategory.get(category.id) ?? null,
      items: itemsByCategory.get(category.id) ?? [],
    }))
    .filter((category) => category.items.length > 0);

  const allMappedItems = menuCategories.flatMap((category) => category.items);

  const status: GuestMenuStatus =
    menuCategories.length > 0 ? "live" : "all_unavailable";

  return {
    restaurant: mappedRestaurant,
    sections,
    categories: menuCategories,
    popularItems: allMappedItems.filter((item) => item.isPopular).slice(0, 8),
    specialItems: allMappedItems.filter((item) => item.isSpecial).slice(0, 8),
    status,
  };
}
