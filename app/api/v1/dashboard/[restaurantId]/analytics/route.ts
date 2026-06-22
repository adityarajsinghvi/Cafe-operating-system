import { NextResponse } from "next/server";

import { getAnalyticsOverview } from "@/services/analytics.service";
import { analyticsRangeSchema } from "@/types/analytics";

type Params = { params: Promise<{ restaurantId: string }> };

// GET /api/v1/dashboard/[restaurantId]/analytics?range=7d
export async function GET(req: Request, { params }: Params) {
  const { restaurantId } = await params;
  const rangeParam = new URL(req.url).searchParams.get("range") ?? "30d";
  const parsedRange = analyticsRangeSchema.safeParse(rangeParam);
  const range = parsedRange.success ? parsedRange.data : "30d";

  const overview = await getAnalyticsOverview(restaurantId, range);
  if (!overview) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(overview);
}
