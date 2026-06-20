import { randomUUID } from "crypto";

import { getMenuExtractionProvider } from "@/lib/extraction";
import {
  extractTextFromPdf,
  fetchUrlAsText,
} from "@/lib/extraction/content";
import type { ExtractionImageInput } from "@/lib/extraction/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import type { DietaryType, ExtractionSource } from "@/types/database";
import {
  computeMenuSummary,
  menuDraftPayloadSchema,
  type MenuDraftPayload,
} from "@/types/menu";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
const ALLOWED_PDF_TYPE = "application/pdf";

async function requireRestaurantAccess(restaurantId: string) {
  const auth = await createAuthenticatedClient();
  const admin = createAdminClient();

  if (!auth || !admin) {
    return null;
  }

  const { data: membership } = await admin
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership) {
    return null;
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, currency")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    return null;
  }

  return { admin, user: auth.user, restaurant };
}

function storagePath(restaurantId: string, fileName: string) {
  return `restaurants/${restaurantId}/menu-uploads/${randomUUID()}-${fileName}`;
}

export async function uploadMenuFiles(
  restaurantId: string,
  files: File[],
  source: ExtractionSource,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) {
    return { error: "Unauthorized" as const };
  }

  const uploadedPaths: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return { error: `File "${file.name}" exceeds 10MB limit` };
    }

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isPdf = file.type === ALLOWED_PDF_TYPE;

    if (source === "photo" && !isImage) {
      return { error: `Unsupported image type: ${file.type}` };
    }

    if (source === "pdf" && !isPdf) {
      return { error: "Please upload a PDF file" };
    }

    const path = storagePath(restaurantId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await ctx.admin.storage
      .from("menu-uploads")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return { error: error.message };
    }

    uploadedPaths.push(path);
  }

  return { paths: uploadedPaths };
}

export async function createExtractionJob({
  restaurantId,
  source,
  sourcePaths = [],
  sourceUrl,
}: {
  restaurantId: string;
  source: ExtractionSource;
  sourcePaths?: string[];
  sourceUrl?: string;
}) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) {
    return { error: "Unauthorized" as const };
  }

  const { data: job, error } = await ctx.admin
    .from("menu_extraction_jobs")
    .insert({
      restaurant_id: restaurantId,
      source,
      source_urls: sourcePaths,
      source_url: sourceUrl ?? null,
      status: "pending",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !job) {
    return { error: error?.message ?? "Failed to create extraction job" };
  }

  return { jobId: job.id };
}

export async function processExtractionJob(jobId: string) {
  const admin = createAdminClient();
  if (!admin) {
    return { error: "Server configuration error" };
  }

  const { data: job, error: jobError } = await admin
    .from("menu_extraction_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !job) {
    return { error: "Extraction job not found" };
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("currency")
    .eq("id", job.restaurant_id)
    .maybeSingle();

  await admin
    .from("menu_extraction_jobs")
    .update({ status: "processing" })
    .eq("id", jobId);

  try {
    const images: ExtractionImageInput[] = [];
    const textBlocks: { text: string; label?: string }[] = [];
    const sourcePaths = (job.source_urls as string[]) ?? [];

    for (const path of sourcePaths) {
      const { data: fileData, error: downloadError } = await admin.storage
        .from("menu-uploads")
        .download(path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to read uploaded file: ${path}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());

      if (job.source === "photo") {
        const mimeType = fileData.type || "image/jpeg";
        images.push({
          mimeType,
          base64: buffer.toString("base64"),
        });
      }

      if (job.source === "pdf") {
        const text = await extractTextFromPdf(buffer);
        if (!text) {
          throw new Error("Could not extract text from PDF");
        }
        textBlocks.push({ text, label: "PDF menu" });
      }
    }

    if (job.source === "url" && job.source_url) {
      const text = await fetchUrlAsText(job.source_url);
      if (!text) {
        throw new Error("Could not extract content from URL");
      }
      textBlocks.push({ text, label: job.source_url });
    }

    const provider = getMenuExtractionProvider();
    const payload = await provider.extract({
      source: job.source,
      images: images.length ? images : undefined,
      textContent: textBlocks.length ? textBlocks : undefined,
      currency: restaurant?.currency ?? "INR",
    });

    const summary = computeMenuSummary(payload);

    const { error: draftError } = await admin.from("menu_drafts").insert({
      restaurant_id: job.restaurant_id,
      job_id: jobId,
      payload,
      summary,
    });

    if (draftError) {
      throw new Error(draftError.message);
    }

    await admin
      .from("menu_extraction_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", jobId);

    return { jobId, status: "completed" as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Menu extraction failed";

    await admin
      .from("menu_extraction_jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return { error: message, jobId, status: "failed" as const };
  }
}

export async function getExtractionJob(jobId: string, restaurantId: string) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) {
    return null;
  }

  const { data } = await ctx.admin
    .from("menu_extraction_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  return data;
}

export async function getMenuDraftByJobId(jobId: string, restaurantId: string) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) {
    return null;
  }

  const { data } = await ctx.admin
    .from("menu_drafts")
    .select("*")
    .eq("job_id", jobId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    ...data,
    payload: menuDraftPayloadSchema.parse(data.payload),
    summary: data.summary as Record<string, number>,
  };
}

export async function updateMenuDraft(
  draftId: string,
  restaurantId: string,
  payload: MenuDraftPayload,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) {
    return { error: "Unauthorized" as const };
  }

  const parsed = menuDraftPayloadSchema.parse(payload);
  const summary = computeMenuSummary(parsed);

  const { error } = await ctx.admin
    .from("menu_drafts")
    .update({ payload: parsed, summary })
    .eq("id", draftId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    return { error: error.message };
  }

  return { success: true as const, summary };
}

export async function publishMenuFromDraft(
  draftId: string,
  restaurantId: string,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) {
    return { error: "Unauthorized" as const };
  }

  const { data: draft } = await ctx.admin
    .from("menu_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!draft) {
    return { error: "Draft not found" };
  }

  const payload = menuDraftPayloadSchema.parse(draft.payload);

  if (!payload.categories.length) {
    return { error: "Add at least one category before publishing" };
  }

  // Replace existing published menu
  await ctx.admin.from("menu_items").delete().eq("restaurant_id", restaurantId);
  await ctx.admin
    .from("menu_categories")
    .delete()
    .eq("restaurant_id", restaurantId);

  for (const [categoryIndex, category] of payload.categories.entries()) {
    const { data: insertedCategory, error: categoryError } = await ctx.admin
      .from("menu_categories")
      .insert({
        restaurant_id: restaurantId,
        name: category.name,
        sort_order: categoryIndex,
        is_active: true,
      })
      .select("id")
      .single();

    if (categoryError || !insertedCategory) {
      return { error: categoryError?.message ?? "Failed to publish category" };
    }

    const items = category.items
      .filter((item) => item.isAvailable !== false)
      .map((item, itemIndex) => ({
        restaurant_id: restaurantId,
        category_id: insertedCategory.id,
        name: item.name,
        description: item.description || null,
        price_cents: item.priceCents,
        dietary_type: item.dietaryType,
        is_available: item.isAvailable !== false,
        is_popular: item.isPopular ?? false,
        is_special: item.isSpecial ?? false,
        sort_order: itemIndex,
      }));

    if (items.length) {
      const { error: itemsError } = await ctx.admin
        .from("menu_items")
        .insert(items as any);

      if (itemsError) {
        return { error: itemsError.message };
      }
    }
  }

  await ctx.admin
    .from("restaurants")
    .update({ onboarding_completed: true })
    .eq("id", restaurantId);

  return { success: true as const };
}

export async function getPublishedMenuStats(restaurantId: string) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) {
    return null;
  }

  const [{ count: categoryCount }, { count: itemCount }] = await Promise.all([
    ctx.admin
      .from("menu_categories")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),
    ctx.admin
      .from("menu_items")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),
  ]);

  return {
    categoryCount: categoryCount ?? 0,
    itemCount: itemCount ?? 0,
  };
}

export async function getPublishedMenuForEdit(restaurantId: string) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return null;

  const { data: categories } = await ctx.admin
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order");

  if (!categories?.length) return { categories: [] };

  const categoryIds = categories.map((category) => category.id);

  const { data: items } = await ctx.admin
    .from("menu_items")
    .select("*")
    .in("category_id", categoryIds)
    .order("sort_order");

  return {
    categories: categories.map((category) => {
      const catItems = (items ?? []).filter((item) => item.category_id === category.id);
      return {
      id: category.id,
      name: category.name,
      sortOrder: category.sort_order,
      isActive: category.is_active,
      sectionId: (catItems[0] as any)?.section_id ?? null,
      items: catItems.map((item) => ({
          id: item.id,
          categoryId: item.category_id,
          name: item.name,
          description: item.description ?? "",
          priceCents: item.price_cents,
          dietaryType: item.dietary_type,
          isAvailable: item.is_available,
          isPopular: item.is_popular,
          isSpecial: item.is_special,
          imageUrl: item.image_url,
          sortOrder: item.sort_order,
          tags: (item as any).tags ?? [],
          sectionId: (item as any).section_id ?? null,
        })),
      };
    }),
  };
}

export async function updatePublishedMenuItem(
  restaurantId: string,
  itemId: string,
  updates: {
    name?: string;
    description?: string;
    priceCents?: number;
    dietaryType?: DietaryType;
    isAvailable?: boolean;
    isPopular?: boolean;
    isSpecial?: boolean;
    tags?: string[];
  },
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.priceCents !== undefined) patch.price_cents = updates.priceCents;
  if (updates.dietaryType !== undefined) patch.dietary_type = updates.dietaryType;
  if (updates.isAvailable !== undefined) patch.is_available = updates.isAvailable;
  if (updates.isPopular !== undefined) patch.is_popular = updates.isPopular;
  if (updates.isSpecial !== undefined) patch.is_special = updates.isSpecial;
  if (updates.tags !== undefined) patch.tags = updates.tags;

  const { error } = await (ctx.admin as any)
    .from("menu_items")
    .update(patch)
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function updateRestaurantSettings(
  restaurantId: string,
  updates: {
    name?: string;
    description?: string;
    primaryColor?: string;
    city?: string;
    smartSuggestionsEnabled?: boolean;
  },
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  const patch: {
    name?: string;
    description?: string;
    primary_color?: string;
    city?: string | null;
    smart_suggestions_enabled?: boolean;
  } = {};
  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.primaryColor !== undefined) patch.primary_color = updates.primaryColor;
  if (updates.city !== undefined) patch.city = updates.city.trim() || null;
  if (updates.smartSuggestionsEnabled !== undefined) patch.smart_suggestions_enabled = updates.smartSuggestionsEnabled;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.admin as any)
    .from("restaurants")
    .update(patch)
    .eq("id", restaurantId);

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function createPublishedCategory(
  restaurantId: string,
  name: string,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Category name is required" };

  const { data: last } = await ctx.admin
    .from("menu_categories")
    .select("sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (last?.sort_order ?? -1) + 1;

  const { data, error } = await ctx.admin
    .from("menu_categories")
    .insert({
      restaurant_id: restaurantId,
      name: trimmed,
      sort_order: sortOrder,
      is_active: true,
    })
    .select("id, name, sort_order, is_active")
    .single();

  if (error) return { error: error.message };
  return { category: data };
}

export async function deletePublishedCategory(
  restaurantId: string,
  categoryId: string,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  await ctx.admin
    .from("menu_items")
    .delete()
    .eq("category_id", categoryId)
    .eq("restaurant_id", restaurantId);

  const { error } = await ctx.admin
    .from("menu_categories")
    .delete()
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function reorderMenuCategories(
  restaurantId: string,
  orderedIds: string[],
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  await Promise.all(
    orderedIds.map((id, index) =>
      ctx.admin
        .from("menu_categories")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("restaurant_id", restaurantId),
    ),
  );

  return { success: true as const };
}

export async function createPublishedMenuItem(
  restaurantId: string,
  categoryId: string,
  input: {
    name: string;
    priceCents: number;
    description?: string;
    dietaryType?: DietaryType;
  },
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  const name = input.name.trim();
  if (!name) return { error: "Item name is required" };
  if (input.priceCents < 0) return { error: "Invalid price" };

  const { data: last } = await ctx.admin
    .from("menu_items")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (last?.sort_order ?? -1) + 1;

  const { data, error } = await ctx.admin
    .from("menu_items")
    .insert({
      restaurant_id: restaurantId,
      category_id: categoryId,
      name,
      description: input.description?.trim() || null,
      price_cents: input.priceCents,
      dietary_type: input.dietaryType ?? "unknown",
      is_available: true,
      is_popular: false,
      is_special: false,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { item: data };
}

export async function deletePublishedMenuItem(
  restaurantId: string,
  itemId: string,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  const { error } = await ctx.admin
    .from("menu_items")
    .delete()
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function reorderMenuItems(
  restaurantId: string,
  categoryId: string,
  orderedIds: string[],
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  await Promise.all(
    orderedIds.map((id, index) =>
      ctx.admin
        .from("menu_items")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("category_id", categoryId)
        .eq("restaurant_id", restaurantId),
    ),
  );

  return { success: true as const };
}

export async function uploadMenuItemImage(
  restaurantId: string,
  itemId: string,
  file: File,
) {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return { error: "Unauthorized" as const };

  if (!file.type.startsWith("image/")) {
    return { error: "Please upload an image file" };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "Image must be under 5 MB" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `restaurants/${restaurantId}/items/${itemId}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await ctx.admin.storage
    .from("menu-images")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) return { error: uploadError.message };

  const { data: publicUrl } = ctx.admin.storage
    .from("menu-images")
    .getPublicUrl(path);

  const { error } = await ctx.admin
    .from("menu_items")
    .update({ image_url: publicUrl.publicUrl })
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId);

  if (error) return { error: error.message };
  return { imageUrl: publicUrl.publicUrl };
}
