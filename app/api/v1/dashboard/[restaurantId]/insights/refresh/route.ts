import { NextResponse } from "next/server";

import { forceRefreshMenuInsights } from "@/services/menu-insights.service";

type Params = { params: Promise<{ restaurantId: string }> };

// POST /api/v1/dashboard/[restaurantId]/insights/refresh
// Manual refresh button — bypasses the TTL but is still rate-limited (max once/hour)
// so a click-happy owner can't run up the Gemini bill.
export async function POST(_req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const outcome = await forceRefreshMenuInsights(restaurantId);
  if (!outcome) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(outcome);
}
