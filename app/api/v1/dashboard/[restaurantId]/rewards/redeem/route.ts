import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/restaurants.service";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/v1/dashboard/[restaurantId]/rewards/redeem
// Body: { customerId: string }
// Atomically deducts threshold from customer's points.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;
  const { customerId } = await req.json();
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

  // Fetch threshold + verify customer belongs to this restaurant
  const [{ data: restaurant }, { data: customer }] = await Promise.all([
    (admin as any)
      .from("restaurants")
      .select("loyalty_redemption_threshold, rewards_enabled")
      .eq("id", restaurantId)
      .single() as Promise<{ data: { loyalty_redemption_threshold: number; rewards_enabled: boolean } | null }>,
    (admin as any)
      .from("customers")
      .select("id, loyalty_points")
      .eq("id", customerId)
      .eq("restaurant_id", restaurantId)
      .single() as Promise<{ data: { id: string; loyalty_points: number } | null }>,
  ]);

  if (!restaurant?.rewards_enabled) {
    return NextResponse.json({ error: "Rewards program is not enabled" }, { status: 400 });
  }
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  if (customer.loyalty_points < restaurant.loyalty_redemption_threshold) {
    return NextResponse.json({ error: "Customer does not have enough points" }, { status: 400 });
  }

  const { data: remainingPoints, error } = await (admin as any).rpc("redeem_customer_reward", {
    p_customer_id: customerId,
    p_threshold: restaurant.loyalty_redemption_threshold,
  }) as { data: number | null; error: any };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, remainingPoints: remainingPoints ?? 0 });
}
