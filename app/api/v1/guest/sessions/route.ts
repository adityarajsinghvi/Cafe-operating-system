import { NextResponse } from "next/server";

import {
  GUEST_SESSION_COOKIE,
  getGuestSessionToken,
  guestSessionCookieOptions,
} from "@/lib/guest/session";
import { getGuestMenuBySlug } from "@/services/guest-menu.service";
import { resolveGuestSession } from "@/services/tables.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slug = body?.slug?.toString();
  const tableToken = body?.tableToken?.toString();

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const menu = await getGuestMenuBySlug(slug);
  if (!menu) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const existingSessionToken = await getGuestSessionToken();

  const result = await resolveGuestSession({
    restaurantId: menu.restaurant.id,
    tableToken: tableToken || undefined,
    existingSessionToken: existingSessionToken ?? undefined,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const response = NextResponse.json({
    sessionId: result.sessionId,
    restaurantId: result.restaurantId,
    tableLabel: result.tableLabel,
    expiresAt: result.expiresAt,
    resumed: result.resumed,
  });

  response.cookies.set(
    GUEST_SESSION_COOKIE,
    result.sessionToken,
    guestSessionCookieOptions(result.expiresAt),
  );

  return response;
}
