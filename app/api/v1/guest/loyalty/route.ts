import { NextResponse } from "next/server";
import { getGuestSessionToken } from "@/lib/guest/session";
import { getSessionByToken } from "@/services/tables.service";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/guest/loyalty
// Returns loyalty_points, taste_profile, and restaurant redemption_threshold
// for the current session's customer. Returns nulls if no customer identity.
export async function GET() {
  const sessionToken = await getGuestSessionToken();
  if (!sessionToken) return NextResponse.json({ loyalty: null });

  const session = await getSessionByToken(sessionToken);
  if (!session?.customerId) return NextResponse.json({ loyalty: null });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ loyalty: null });

  const [{ data: customer }, { data: restaurant }] = await Promise.all([
    (admin as any)
      .from("customers")
      .select("loyalty_points, taste_profile, redemptions_count")
      .eq("id", session.customerId)
      .single() as Promise<{
        data: { loyalty_points: number; taste_profile: { top_items: string[]; avg_spend: number } | null; redemptions_count: number } | null;
      }>,
    (admin as any)
      .from("restaurants")
      .select("loyalty_points_per_order, loyalty_redemption_threshold, rewards_enabled, reward_title, reward_description")
      .eq("id", session.restaurantId)
      .single() as Promise<{
        data: {
          loyalty_points_per_order: number;
          loyalty_redemption_threshold: number;
          rewards_enabled: boolean;
          reward_title: string;
          reward_description: string | null;
        } | null;
      }>,
  ]);

  if (!customer) return NextResponse.json({ loyalty: null });
  // Hide loyalty data from guest if program is disabled
  if (!restaurant?.rewards_enabled) return NextResponse.json({ loyalty: null });

  return NextResponse.json({
    loyalty: {
      points: customer.loyalty_points,
      tasteProfile: customer.taste_profile,
      redemptionsCount: customer.redemptions_count,
      pointsPerOrder: restaurant.loyalty_points_per_order,
      redemptionThreshold: restaurant.loyalty_redemption_threshold,
      rewardTitle: restaurant.reward_title,
      rewardDescription: restaurant.reward_description,
    },
  });
}
