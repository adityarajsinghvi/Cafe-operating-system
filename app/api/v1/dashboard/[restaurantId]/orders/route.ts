import { NextResponse } from "next/server";

import { listRestaurantOrders } from "@/services/orders.service";
import type { OrderStatus } from "@/types/order";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  const status = statusParam
    ? (statusParam.split(",") as OrderStatus[])
    : undefined;

  const orders = await listRestaurantOrders(restaurantId, { status });

  if (!orders) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ orders });
}
