import { NextResponse } from "next/server";
import { listActiveSections } from "@/services/sections.service";

// GET /api/v1/guest/sections?restaurantId=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ sections: [] });
  }

  const sections = await listActiveSections(restaurantId);
  return NextResponse.json({ sections });
}
