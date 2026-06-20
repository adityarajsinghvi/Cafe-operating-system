import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/restaurants.service";
import { listRestaurantCustomers } from "@/services/customers.service";

// GET /api/v1/dashboard/[restaurantId]/customers
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;
  const customers = await listRestaurantCustomers(restaurantId);
  return NextResponse.json({ customers });
}
