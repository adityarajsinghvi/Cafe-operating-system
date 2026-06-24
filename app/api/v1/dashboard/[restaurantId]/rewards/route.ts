import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/restaurants.service";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ restaurantId: string }> };

// GET /api/v1/dashboard/[restaurantId]/rewards
// Returns program config + aggregated stats + leaderboard
export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const [{ data: restaurant }, { data: customers }] = await Promise.all([
    (admin as any)
      .from("restaurants")
      .select(
        "plan, rewards_enabled, reward_title, reward_description, loyalty_points_per_order, loyalty_redemption_threshold",
      )
      .eq("id", restaurantId)
      .single() as Promise<{
        data: {
          plan: string;
          rewards_enabled: boolean;
          reward_title: string;
          reward_description: string | null;
          loyalty_points_per_order: number;
          loyalty_redemption_threshold: number;
        } | null;
      }>,
    (admin as any)
      .from("customers")
      .select("id, name, phone, loyalty_points, visit_count, total_spent, last_visit_at, redemptions_count")
      .eq("restaurant_id", restaurantId)
      .gt("loyalty_points", 0)
      .order("loyalty_points", { ascending: false }) as Promise<{
        data: Array<{
          id: string;
          name: string | null;
          phone: string;
          loyalty_points: number;
          visit_count: number;
          total_spent: number;
          last_visit_at: string | null;
          redemptions_count: number;
        }> | null;
      }>,
  ]);

  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allCustomers = customers ?? [];
  const threshold = restaurant.loyalty_redemption_threshold;

  // Also count all customers for redemptions_count total
  const { data: allForRedemptions } = await (admin as any)
    .from("customers")
    .select("redemptions_count")
    .eq("restaurant_id", restaurantId)
    .gt("redemptions_count", 0) as { data: Array<{ redemptions_count: number }> | null };

  const totalRedemptions = (allForRedemptions ?? []).reduce((s, c) => s + c.redemptions_count, 0);

  const stats = {
    totalMembers: allCustomers.length,
    totalPointsIssued: allCustomers.reduce((s, c) => s + c.loyalty_points, 0),
    avgPoints:
      allCustomers.length > 0
        ? Math.round(allCustomers.reduce((s, c) => s + c.loyalty_points, 0) / allCustomers.length)
        : 0,
    readyToRedeem: allCustomers.filter((c) => c.loyalty_points >= threshold).length,
    closeToRedeem: allCustomers.filter(
      (c) => c.loyalty_points >= threshold * 0.7 && c.loyalty_points < threshold,
    ).length,
    totalRedemptions,
  };

  const leaderboard = allCustomers.slice(0, 15).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    points: c.loyalty_points,
    visits: c.visit_count,
    totalSpent: c.total_spent,
    lastVisitAt: c.last_visit_at,
    progress: Math.min(100, Math.round((c.loyalty_points / threshold) * 100)),
    readyToRedeem: c.loyalty_points >= threshold,
  }));

  const readyList = allCustomers
    .filter((c) => c.loyalty_points >= threshold)
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      points: c.loyalty_points,
      visits: c.visit_count,
      lastVisitAt: c.last_visit_at,
    }));

  return NextResponse.json({
    plan: restaurant.plan,
    config: {
      enabled: restaurant.rewards_enabled,
      pointsPerVisit: restaurant.loyalty_points_per_order,
      redemptionThreshold: restaurant.loyalty_redemption_threshold,
      rewardTitle: restaurant.reward_title,
      rewardDescription: restaurant.reward_description,
    },
    stats,
    leaderboard,
    readyList,
  });
}

// PATCH /api/v1/dashboard/[restaurantId]/rewards
// Updates program config
export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const body = await req.json();

  const patch: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") patch.rewards_enabled = body.enabled;
  if (typeof body.pointsPerVisit === "number") patch.loyalty_points_per_order = body.pointsPerVisit;
  if (typeof body.redemptionThreshold === "number") patch.loyalty_redemption_threshold = body.redemptionThreshold;
  if (typeof body.rewardTitle === "string") patch.reward_title = body.rewardTitle.trim();
  if (typeof body.rewardDescription === "string") patch.reward_description = body.rewardDescription.trim() || null;

  const { error } = await (admin as any)
    .from("restaurants")
    .update(patch)
    .eq("id", restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
