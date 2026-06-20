import { NextResponse } from "next/server";

import { listRestaurantBills } from "@/services/orders.service";
import type { BillPaymentStatus } from "@/types/order";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const paymentStatus =
    status === "paid" || status === "unpaid"
      ? (status as BillPaymentStatus)
      : undefined;

  const bills = await listRestaurantBills(restaurantId, { paymentStatus });

  if (!bills) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ bills });
}
