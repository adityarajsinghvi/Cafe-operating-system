import { NextResponse } from "next/server";

import { getCurrentUser } from "@/services/restaurants.service";
import { updateSection, deleteSection } from "@/services/sections.service";

// PATCH /api/v1/dashboard/[restaurantId]/sections/[sectionId]
// Body: { name?, emoji?, description?, isActive?, sortOrder? }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string; sectionId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
  const body = await req.json().catch(() => null);

  const section = await updateSection(sectionId, {
    name: body?.name,
    emoji: body?.emoji,
    description: body?.description,
    isActive: body?.isActive,
    sortOrder: body?.sortOrder,
  });

  if (!section) {
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }

  return NextResponse.json({ section });
}

// DELETE /api/v1/dashboard/[restaurantId]/sections/[sectionId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ restaurantId: string; sectionId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
  const ok = await deleteSection(sectionId);

  if (!ok) {
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
