import type { PlanTier, Restaurant } from "@/types/database";

export interface RestaurantFeatures {
  plan: PlanTier;
  // Order flow
  ordering: boolean;
  tokenDisplay: boolean;
  // Guest-side
  smartSuggestions: boolean;
  serviceRequests: boolean;
  loyalty: boolean;
  // Owner dashboard sections
  bills: boolean;
  sections: boolean;
  fullAnalytics: boolean;
  aiInsights: boolean;
}

/**
 * Derives the complete feature set for a restaurant from its DB row.
 *
 * "table" plan: every feature is on by default (legacy sit-down cafes — nothing breaks).
 * "cart" plan: every advanced feature is off by default; individual flags can turn them on.
 */
export function getFeatures(r: Restaurant): RestaurantFeatures {
  const plan: PlanTier = r.plan ?? "cart";
  const isTable = plan === "table";

  return {
    plan,
    ordering:        r.ordering_enabled         ?? true,
    tokenDisplay:    r.token_display_enabled     ?? false,
    smartSuggestions: r.smart_suggestions_enabled ?? false,
    serviceRequests: r.service_requests_enabled  || isTable,
    loyalty:         r.rewards_enabled           ?? false,
    bills:           r.bills_enabled             || isTable,
    sections:        r.sections_enabled          || isTable,
    fullAnalytics:   r.full_analytics_enabled    || isTable,
    aiInsights:      r.ai_insights_enabled       || isTable,
  };
}
