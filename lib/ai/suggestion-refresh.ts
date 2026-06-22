import { createAdminClient } from "@/lib/supabase/admin";
import { getWeatherForCity } from "@/lib/weather/open-meteo";
import { generateContextualSuggestion } from "@/lib/ai/contextual-suggestion";

export const SUGGESTION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// Weather (and therefore the AI suggestion) is identical for every guest of a
// given restaurant at a given time, so it's computed once here and cached on
// the restaurant row instead of being recomputed per guest session.
export async function refreshSuggestionForRestaurant(restaurantId: string) {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: restaurant } = await (admin as any)
    .from("restaurants")
    .select("city, smart_suggestions_enabled")
    .eq("id", restaurantId)
    .single();

  if (!restaurant?.smart_suggestions_enabled || !restaurant.city) return;

  const { data: menuItems } = await (admin as any)
    .from("menu_items")
    .select("name")
    .eq("restaurant_id", restaurantId)
    .eq("is_available", true)
    .limit(60);

  const menuItemNames = ((menuItems ?? []) as Array<{ name: string }>).map((i) => i.name);
  if (!menuItemNames.length) return;

  const weather = await getWeatherForCity(restaurant.city);
  if (!weather) return;

  const suggestion = await generateContextualSuggestion({
    weather,
    timeOfDay: "morning", // getTimeOfDay() is called inside the generator
    menuItemNames,
  });

  await (admin as any)
    .from("restaurants")
    .update({
      cached_suggestion: suggestion,
      cached_weather: { label: weather.label, condition: weather.condition, tempC: weather.tempC },
      suggestion_refreshed_at: new Date().toISOString(),
    })
    .eq("id", restaurantId);
}

export async function refreshStaleSuggestions() {
  const admin = createAdminClient();
  if (!admin) return { refreshed: 0 };

  const { data: restaurants } = await (admin as any)
    .from("restaurants")
    .select("id, suggestion_refreshed_at")
    .eq("smart_suggestions_enabled", true)
    .not("city", "is", null);

  const cutoff = Date.now() - SUGGESTION_TTL_MS;
  const stale = ((restaurants ?? []) as Array<{ id: string; suggestion_refreshed_at: string | null }>).filter(
    (r) => !r.suggestion_refreshed_at || new Date(r.suggestion_refreshed_at).getTime() < cutoff,
  );

  await Promise.all(stale.map((r) => refreshSuggestionForRestaurant(r.id)));
  return { refreshed: stale.length };
}
