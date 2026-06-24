import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/restaurants.service";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ restaurantId: string }> };

// POST /api/v1/dashboard/[restaurantId]/stamps
// Body: { phone: string; name?: string }
// Manually grants a stamp (loyalty point) to a customer by phone.
// Used for Plan 1 (menu-only) where there's no digital ordering.
export async function POST(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;
  const body = await req.json();
  const phone = String(body.phone ?? "").trim();
  const name = typeof body.name === "string" ? body.name.trim() || null : null;

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

  // Verify membership and get rewards config
  const [{ data: membership }, { data: restaurant }] = await Promise.all([
    admin
      .from("restaurant_members")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", user.id)
      .maybeSingle(),
    (admin as any)
      .from("restaurants")
      .select("rewards_enabled, loyalty_points_per_order, loyalty_redemption_threshold, reward_title")
      .eq("id", restaurantId)
      .single() as Promise<{
        data: {
          rewards_enabled: boolean;
          loyalty_points_per_order: number;
          loyalty_redemption_threshold: number;
          reward_title: string;
        } | null;
      }>,
  ]);

  if (!membership) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  if (!restaurant.rewards_enabled) {
    return NextResponse.json({ error: "Rewards program is not enabled" }, { status: 400 });
  }

  const pointsToAdd = restaurant.loyalty_points_per_order;
  const threshold = restaurant.loyalty_redemption_threshold;

  // Upsert customer
  const { data: existing } = await (admin as any)
    .from("customers")
    .select("id, name, loyalty_points, visit_count")
    .eq("restaurant_id", restaurantId)
    .eq("phone", phone)
    .maybeSingle() as {
      data: { id: string; name: string | null; loyalty_points: number; visit_count: number } | null;
    };

  let customerId: string;
  let customerName: string | null;
  let currentPoints: number;
  let currentVisits: number;

  if (existing) {
    customerId = existing.id;
    customerName = existing.name ?? name;
    currentPoints = existing.loyalty_points;
    currentVisits = existing.visit_count;

    // Update name if not set
    const updatePatch: Record<string, unknown> = {
      loyalty_points: currentPoints + pointsToAdd,
      visit_count: currentVisits + 1,
      last_visit_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (name && !existing.name) updatePatch.name = name;

    await (admin as any).from("customers").update(updatePatch).eq("id", customerId);
  } else {
    const { data: created } = await (admin as any)
      .from("customers")
      .insert({
        restaurant_id: restaurantId,
        phone,
        name,
        loyalty_points: pointsToAdd,
        visit_count: 1,
        last_visit_at: new Date().toISOString(),
      })
      .select("id, name, loyalty_points, visit_count")
      .single() as {
        data: { id: string; name: string | null; loyalty_points: number; visit_count: number } | null;
      };

    if (!created) return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    customerId = created.id;
    customerName = created.name;
    currentPoints = 0;
    currentVisits = 0;
  }

  const newPoints = currentPoints + pointsToAdd;

  const pointsPerVisit = restaurant.loyalty_points_per_order;

  return NextResponse.json({
    customer: {
      id: customerId,
      name: customerName,
      phone,
      points: newPoints,
      visits: currentVisits + 1,
    },
    threshold,
    pointsPerVisit,
    rewardTitle: restaurant.reward_title,
    readyToRedeem: newPoints >= threshold,
    isNewCustomer: !existing,
  });
}

// GET /api/v1/dashboard/[restaurantId]/stamps?phone=...
// Look up a customer by phone to pre-fill the grant stamp sheet.
export async function GET(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone") ?? "";

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ customer: null });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const [{ data: membership }, { data: customer }, { data: restaurant }] = await Promise.all([
    admin
      .from("restaurant_members")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", user.id)
      .maybeSingle(),
    (admin as any)
      .from("customers")
      .select("id, name, loyalty_points, visit_count")
      .eq("restaurant_id", restaurantId)
      .eq("phone", phone)
      .maybeSingle() as Promise<{
        data: { id: string; name: string | null; loyalty_points: number; visit_count: number } | null;
      }>,
    (admin as any)
      .from("restaurants")
      .select("rewards_enabled, loyalty_points_per_order, loyalty_redemption_threshold, reward_title")
      .eq("id", restaurantId)
      .single() as Promise<{
        data: {
          rewards_enabled: boolean;
          loyalty_points_per_order: number;
          loyalty_redemption_threshold: number;
          reward_title: string;
        } | null;
      }>,
  ]);

  if (!membership) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  return NextResponse.json({
    customer: customer ?? null,
    threshold: restaurant?.loyalty_redemption_threshold ?? 10,
    rewardTitle: restaurant?.reward_title ?? "Free item",
    pointsPerVisit: restaurant?.loyalty_points_per_order ?? 1,
  });
}
