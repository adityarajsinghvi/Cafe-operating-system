import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/restaurants.service";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/v1/dashboard/[restaurantId]/sections/assign
// Body: { categoryId, sectionId } — assigns all items in a category to a section
export async function POST(
  req: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId } = await params;
  const body = await req.json().catch(() => null);
  const categoryId = body?.categoryId?.toString();
  const sectionId: string | null = body?.sectionId ?? null;

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

  // Verify the category belongs to this restaurant before updating
  const { data: cat } = await (admin as any)
    .from("menu_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const { error } = await (admin as any)
    .from("menu_items")
    .update({ section_id: sectionId })
    .eq("category_id", categoryId);

  if (error) return NextResponse.json({ error: "Failed to assign section" }, { status: 500 });

  return NextResponse.json({ success: true });
}
