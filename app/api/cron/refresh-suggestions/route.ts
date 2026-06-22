import { NextResponse } from "next/server";
import { refreshStaleSuggestions } from "@/lib/ai/suggestion-refresh";

// GET /api/cron/refresh-suggestions
// Invoke this on a schedule (e.g. every 4 hours via Vercel Cron or any
// external scheduler) to recompute weather + AI suggestions once per
// restaurant. Guests only ever read the cached result — see
// /api/v1/guest/suggestion.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await refreshStaleSuggestions();
  return NextResponse.json(result);
}
