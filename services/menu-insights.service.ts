import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import { collectInsightCandidates, MIN_ORDERS_FOR_INSIGHTS, writeInsightsNarrative } from "@/lib/ai/menu-insights";
import type { MenuInsightsResult, MenuInsightsState } from "@/types/analytics";

// Owners check this page rarely, so insights are refreshed lazily on read
// rather than on a cron — but gated hard so a busy owner refreshing the tab
// doesn't burn a Gemini call every time.
const INSIGHTS_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FORCE_REFRESH_COOLDOWN_MS = 60 * 60 * 1000; // 1h, for the manual "Refresh" button

async function requireRestaurantAccess(restaurantId: string) {
  const auth = await createAuthenticatedClient();
  const admin = createAdminClient();
  if (!auth || !admin) return null;

  const { data: membership } = await admin
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { admin: admin as any };
}

interface RestaurantInsightsRow {
  cached_menu_insights: MenuInsightsResult | null;
  menu_insights_refreshed_at: string | null;
  menu_insights_served_order_count: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadRow(admin: any, restaurantId: string): Promise<RestaurantInsightsRow | null> {
  const { data } = await admin
    .from("restaurants")
    .select("cached_menu_insights, menu_insights_refreshed_at, menu_insights_served_order_count")
    .eq("id", restaurantId)
    .single();
  return data ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function regenerateAndPersist(admin: any, restaurantId: string): Promise<MenuInsightsState> {
  const candidateData = await collectInsightCandidates(admin, restaurantId);
  const result =
    candidateData.candidates.length > 0
      ? await writeInsightsNarrative(candidateData.candidates, candidateData.billableOrderCount)
      : null;
  const refreshedAt = new Date().toISOString();

  await admin
    .from("restaurants")
    .update({
      cached_menu_insights: result,
      menu_insights_refreshed_at: refreshedAt,
      menu_insights_served_order_count: candidateData.servedOrderCount,
    })
    .eq("id", restaurantId);

  return {
    result,
    refreshedAt,
    insufficientData: candidateData.billableOrderCount < MIN_ORDERS_FOR_INSIGHTS,
  };
}

/** Lazy read: serves the cache unless it's past TTL AND new served orders have come in since. */
export async function getMenuInsights(restaurantId: string): Promise<MenuInsightsState | null> {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return null;

  const row = await loadRow(ctx.admin, restaurantId);
  if (!row) return null;

  const isStale =
    !row.menu_insights_refreshed_at ||
    Date.now() - new Date(row.menu_insights_refreshed_at).getTime() > INSIGHTS_TTL_MS;

  if (!isStale) {
    return {
      result: row.cached_menu_insights,
      refreshedAt: row.menu_insights_refreshed_at,
      insufficientData: row.cached_menu_insights === null && row.menu_insights_refreshed_at !== null,
    };
  }

  // Past TTL — but only spend a Gemini call if there's actually new sales data to react to.
  const candidateData = await collectInsightCandidates(ctx.admin, restaurantId);
  if (row.menu_insights_refreshed_at && candidateData.servedOrderCount === row.menu_insights_served_order_count) {
    const refreshedAt = new Date().toISOString();
    await ctx.admin.from("restaurants").update({ menu_insights_refreshed_at: refreshedAt }).eq("id", restaurantId);
    return {
      result: row.cached_menu_insights,
      refreshedAt,
      insufficientData: row.cached_menu_insights === null,
    };
  }

  const result =
    candidateData.candidates.length > 0
      ? await writeInsightsNarrative(candidateData.candidates, candidateData.billableOrderCount)
      : null;
  const refreshedAt = new Date().toISOString();
  await ctx.admin
    .from("restaurants")
    .update({
      cached_menu_insights: result,
      menu_insights_refreshed_at: refreshedAt,
      menu_insights_served_order_count: candidateData.servedOrderCount,
    })
    .eq("id", restaurantId);

  return {
    result,
    refreshedAt,
    insufficientData: candidateData.billableOrderCount < MIN_ORDERS_FOR_INSIGHTS,
  };
}

/** Manual "Refresh" button: bypasses the TTL/no-new-data checks, but still rate-limited. */
export async function forceRefreshMenuInsights(
  restaurantId: string,
): Promise<{ state: MenuInsightsState; rateLimited: boolean } | null> {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return null;

  const row = await loadRow(ctx.admin, restaurantId);
  if (!row) return null;

  const sinceLastRefresh = row.menu_insights_refreshed_at
    ? Date.now() - new Date(row.menu_insights_refreshed_at).getTime()
    : Infinity;

  if (sinceLastRefresh < FORCE_REFRESH_COOLDOWN_MS) {
    return {
      state: {
        result: row.cached_menu_insights,
        refreshedAt: row.menu_insights_refreshed_at,
        insufficientData: row.cached_menu_insights === null && row.menu_insights_refreshed_at !== null,
      },
      rateLimited: true,
    };
  }

  const state = await regenerateAndPersist(ctx.admin, restaurantId);
  return { state, rateLimited: false };
}
