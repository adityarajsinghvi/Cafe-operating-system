import { NextResponse } from "next/server";

import { getGuestSessionToken } from "@/lib/guest/session";
import { createGuestOrder, listGuestSessionOrders } from "@/services/orders.service";

export async function GET() {
  const sessionToken = await getGuestSessionToken();

  if (!sessionToken) {
    return NextResponse.json({ orders: [] });
  }

  const result = await listGuestSessionOrders(sessionToken);

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    orders: result.orders,
    billPaymentStatus: result.billPaymentStatus ?? null,
  });
}

export async function POST(request: Request) {
  const sessionToken = await getGuestSessionToken();

  if (!sessionToken) {
    return NextResponse.json(
      { error: "No active session. Scan your table QR to order." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);

  // Extract identity fields and strip them from the order payload
  const { phone, name, ...orderPayload } = body ?? {};
  const identity =
    typeof phone === "string" && phone.length === 10
      ? { phone, name: typeof name === "string" ? name.trim() : "" }
      : undefined;

  const result = await createGuestOrder(sessionToken, orderPayload, identity);

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ order: result.order });
}
