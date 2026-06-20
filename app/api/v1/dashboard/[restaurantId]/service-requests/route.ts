import { NextResponse } from "next/server";

import { listOpenServiceRequests } from "@/services/orders.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const requests = await listOpenServiceRequests(restaurantId);

  if (!requests) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ requests });
}
