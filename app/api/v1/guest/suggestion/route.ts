import { NextResponse } from "next/server";
import { getGuestSessionToken } from "@/lib/guest/session";
import { getSessionByToken } from "@/services/tables.service";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/guest/suggestion
// Weather + AI suggestion are identical for every guest of a restaurant at a
// given time, so they're computed once every 4 hours server-side (see
// /api/cron/refresh-suggestions) and just read from the cache here — no live
// weather or Gemini calls on the guest path.
export async function GET() {
  const sessionToken = await getGuestSessionToken();
  if (!sessionToken) return NextResponse.json({ suggestion: null });

  const session = await getSessionByToken(sessionToken);
  if (!session) return NextResponse.json({ suggestion: null });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ suggestion: null });

  const { data: restaurant } = await (admin as any)
    .from("restaurants")
    .select("smart_suggestions_enabled, cached_suggestion, cached_weather")
    .eq("id", session.restaurantId)
    .single() as {
      data: {
        smart_suggestions_enabled: boolean;
        cached_suggestion: unknown | null;
        cached_weather: { label: string; condition: string; tempC: number } | null;
      } | null;
    };

  if (!restaurant?.smart_suggestions_enabled || !restaurant.cached_suggestion) {
    return NextResponse.json({ suggestion: null });
  }

  return NextResponse.json({
    suggestion: restaurant.cached_suggestion,
    weather: restaurant.cached_weather,
  });
}
