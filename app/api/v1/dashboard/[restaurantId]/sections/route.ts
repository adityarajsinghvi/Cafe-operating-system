import { NextResponse } from "next/server";

import { getCurrentUser } from "@/services/restaurants.service";
import {
  listSectionsWithCounts,
  createSection,
} from "@/services/sections.service";

// GET /api/v1/dashboard/[restaurantId]/sections
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;
  const sections = await listSectionsWithCounts(restaurantId);
  return NextResponse.json({ sections });
}

// POST /api/v1/dashboard/[restaurantId]/sections
// Body: { name, emoji?, description? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;
  const body = await req.json().catch(() => null);
  const name = body?.name?.toString().trim();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const section = await createSection(restaurantId, {
    name,
    emoji: body?.emoji,
    description: body?.description,
  });

  if (!section) {
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }

  return NextResponse.json({ section }, { status: 201 });
}
