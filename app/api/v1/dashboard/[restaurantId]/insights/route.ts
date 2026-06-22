import { NextResponse } from "next/server";

import { getMenuInsights } from "@/services/menu-insights.service";

type Params = { params: Promise<{ restaurantId: string }> };

// GET /api/v1/dashboard/[restaurantId]/insights
// Lazily refreshes the cached AI menu insights (TTL + new-data gated) and returns them.
export async function GET(_req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const state = await getMenuInsights(restaurantId);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(state);
}
