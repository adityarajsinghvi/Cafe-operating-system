import { NextResponse } from "next/server";

import { getGuestSessionToken } from "@/lib/guest/session";
import { createServiceRequest } from "@/services/orders.service";

export async function POST(request: Request) {
  const sessionToken = await getGuestSessionToken();

  if (!sessionToken) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const requestType = body?.type?.toString();

  if (!["waiter", "water", "bill"].includes(requestType ?? "")) {
    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  }

  const result = await createServiceRequest(
    sessionToken,
    requestType as "waiter" | "water" | "bill",
  );

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ request: result.request });
}
