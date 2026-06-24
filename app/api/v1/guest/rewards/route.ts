import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/guest/rewards?restaurantId=...&phone=...
// Public endpoint — guests look up their own stamp count by phone number.
// No auth required (phone is the "key").
export async function GET(req: Request) {
  const url = new URL(req.url);
  const restaurantId = url.searchParams.get("restaurantId") ?? "";
  const phone = url.searchParams.get("phone") ?? "";

  if (!restaurantId) return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const [{ data: restaurant }, { data: customer }] = await Promise.all([
    (admin as any)
      .from("restaurants")
      .select("rewards_enabled, loyalty_points_per_order, loyalty_redemption_threshold, reward_title, reward_description")
      .eq("id", restaurantId)
      .single() as Promise<{
        data: {
          rewards_enabled: boolean;
          loyalty_points_per_order: number;
          loyalty_redemption_threshold: number;
          reward_title: string;
          reward_description: string | null;
        } | null;
      }>,
    (admin as any)
      .from("customers")
      .select("id, name, loyalty_points, visit_count, redemptions_count")
      .eq("restaurant_id", restaurantId)
      .eq("phone", phone)
      .maybeSingle() as Promise<{
        data: {
          id: string;
          name: string | null;
          loyalty_points: number;
          visit_count: number;
          redemptions_count: number;
        } | null;
      }>,
  ]);

  if (!restaurant?.rewards_enabled) {
    return NextResponse.json({ error: "Rewards not enabled" }, { status: 404 });
  }

  return NextResponse.json({
    found: Boolean(customer),
    customer: customer
      ? {
          name: customer.name,
          points: customer.loyalty_points,
          visits: customer.visit_count,
          redemptionsCount: customer.redemptions_count,
        }
      : null,
    threshold: restaurant.loyalty_redemption_threshold,
    pointsPerVisit: restaurant.loyalty_points_per_order,
    rewardTitle: restaurant.reward_title,
    rewardDescription: restaurant.reward_description,
  });
}
