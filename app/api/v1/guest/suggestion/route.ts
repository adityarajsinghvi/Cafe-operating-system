import { NextResponse } from "next/server";
import { getGuestSessionToken } from "@/lib/guest/session";
import { getSessionByToken } from "@/services/tables.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWeatherForCity } from "@/lib/weather/open-meteo";
import { generateContextualSuggestion } from "@/lib/ai/contextual-suggestion";

// GET /api/v1/guest/suggestion
// Returns a contextual menu suggestion based on weather, time, and taste profile.
// Returns { suggestion: null } when smart suggestions are disabled or data is unavailable.
export async function GET() {
  const sessionToken = await getGuestSessionToken();
  if (!sessionToken) return NextResponse.json({ suggestion: null });

  const session = await getSessionByToken(sessionToken);
  if (!session) return NextResponse.json({ suggestion: null });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ suggestion: null });

  // Fetch restaurant settings + menu items + optional taste profile in parallel
  const [{ data: restaurant }, { data: menuItems }, tasteProfileResult] = await Promise.all([
    (admin as any)
      .from("restaurants")
      .select("city, smart_suggestions_enabled")
      .eq("id", session.restaurantId)
      .single() as Promise<{
        data: { city: string | null; smart_suggestions_enabled: boolean } | null;
      }>,
    (admin as any)
      .from("menu_items")
      .select("name")
      .eq("restaurant_id", session.restaurantId)
      .eq("is_available", true)
      .limit(60) as Promise<{ data: Array<{ name: string }> | null }>,
    session.customerId
      ? (admin as any)
          .from("customers")
          .select("taste_profile")
          .eq("id", session.customerId)
          .single() as Promise<{
            data: { taste_profile: { top_items: string[] } | null } | null;
          }>
      : Promise.resolve({ data: null }),
  ]);

  if (!restaurant?.smart_suggestions_enabled) {
    return NextResponse.json({ suggestion: null });
  }

  if (!restaurant.city) {
    return NextResponse.json({ suggestion: null });
  }

  const weather = await getWeatherForCity(restaurant.city);
  if (!weather) return NextResponse.json({ suggestion: null });

  const menuItemNames = (menuItems ?? []).map((i) => i.name);
  if (!menuItemNames.length) return NextResponse.json({ suggestion: null });

  const tasteProfile =
    (tasteProfileResult as any)?.data?.taste_profile ?? null;

  const suggestion = await generateContextualSuggestion({
    weather,
    timeOfDay: "morning", // getTimeOfDay() is called inside the generator
    menuItemNames,
    tasteProfile,
  });

  return NextResponse.json({
    suggestion,
    weather: { label: weather.label, condition: weather.condition, tempC: weather.tempC },
  });
}
