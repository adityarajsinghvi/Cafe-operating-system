import type { PlanTier, Restaurant } from "@/types/database";

export interface RestaurantFeatures {
  plan: PlanTier;
  planLabel: string;
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

const PLAN_LABELS: Record<PlanTier, string> = {
  menu:    "Menu",
  starter: "Starter",
  pro:     "Pro",
  // legacy DB values — treated as their nearest equivalent
  cart:    "Starter",
  table:   "Pro",
};

/**
 * menu    (₹999/yr)  — digital menu + rewards + customer DB only
 * starter (₹1499/yr) — full ordering + token + UPI + today dashboard + rewards
 * pro     (₹2499/yr) — everything including full analytics + AI insights
 *
 * Legacy "cart" → treated as starter, "table" → treated as pro.
 */
export function getFeatures(r: Restaurant): RestaurantFeatures {
  const plan: PlanTier = r.plan ?? "menu";

  const isStarter = plan === "starter" || plan === "cart";
  const isPro     = plan === "pro"     || plan === "table";

  return {
    plan,
    planLabel: PLAN_LABELS[plan] ?? "Menu",

    // Ordering + token: menu plan never gets it; starter/pro use the toggle (default on)
    ordering:     (isStarter || isPro) ? (r.ordering_enabled ?? true) : false,
    tokenDisplay: (isStarter || isPro) ? (r.token_display_enabled ?? true) : false,

    // Always off (hidden globally)
    smartSuggestions: false,

    // Service requests + sections: pro only
    serviceRequests: (r.service_requests_enabled ?? false) || isPro,
    sections:        (r.sections_enabled ?? false)         || isPro,

    // Loyalty + customer DB: all plans
    loyalty: r.rewards_enabled ?? true,
    bills:   r.bills_enabled   ?? true,

    // Analytics: pro only
    fullAnalytics: (r.full_analytics_enabled ?? false) || isPro,
    aiInsights:    (r.ai_insights_enabled    ?? false) || isPro,
  };
}

export const PLAN_PRICING: Record<"menu" | "starter" | "pro", { label: string; price: number; description: string }> = {
  menu: {
    label:       "Menu",
    price:       999,
    description: "Digital menu, rewards & customer database",
  },
  starter: {
    label:       "Starter",
    price:       1499,
    description: "Full ordering, token queue, UPI payments & rewards",
  },
  pro: {
    label:       "Pro",
    price:       2499,
    description: "Everything in Starter plus full analytics & AI insights",
  },
};

export const PLAN_FEATURES: Record<"menu" | "starter" | "pro", { text: string; included: boolean }[]> = {
  menu: [
    { text: "Digital menu (QR code)", included: true  },
    { text: "Rewards & loyalty",      included: true  },
    { text: "Customer database",      included: true  },
    { text: "Online ordering",        included: false },
    { text: "Token queue system",     included: false },
    { text: "UPI payment collection", included: false },
    { text: "Analytics dashboard",    included: false },
    { text: "AI menu insights",       included: false },
  ],
  starter: [
    { text: "Digital menu (QR code)", included: true  },
    { text: "Rewards & loyalty",      included: true  },
    { text: "Customer database",      included: true  },
    { text: "Online ordering",        included: true  },
    { text: "Token queue system",     included: true  },
    { text: "UPI payment collection", included: true  },
    { text: "Analytics dashboard",    included: false },
    { text: "AI menu insights",       included: false },
  ],
  pro: [
    { text: "Digital menu (QR code)", included: true },
    { text: "Rewards & loyalty",      included: true },
    { text: "Customer database",      included: true },
    { text: "Online ordering",        included: true },
    { text: "Token queue system",     included: true },
    { text: "UPI payment collection", included: true },
    { text: "Analytics dashboard",    included: true },
    { text: "AI menu insights",       included: true },
  ],
};
