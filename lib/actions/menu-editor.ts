"use server";

import { revalidatePath } from "next/cache";

import {
  createPublishedCategory,
  createPublishedMenuItem,
  deletePublishedCategory,
  deletePublishedMenuItem,
  reorderMenuCategories,
  reorderMenuItems,
  updatePublishedMenuItem,
  updateRestaurantSettings,
  uploadMenuItemImage,
} from "@/services/menu.service";
import {
  createRestaurantTable,
  createRestaurantTablesBulk,
  deleteRestaurantTable,
  updateRestaurantTable,
} from "@/services/tables.service";
import type { DietaryType } from "@/types/database";

export type EditorActionState = { error?: string; success?: string };

export async function updateMenuItemAction(
  restaurantId: string,
  itemId: string,
  formData: FormData,
): Promise<EditorActionState> {
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString() ?? "";
  const priceRaw = formData.get("priceCents")?.toString();
  const dietaryType = formData.get("dietaryType")?.toString();
  const isAvailable = formData.get("isAvailable") === "on";
  const isPopular = formData.get("isPopular") === "on";
  const isSpecial = formData.get("isSpecial") === "on";
  const tagsRaw = formData.get("tags")?.toString() ?? "";
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const priceCents = priceRaw ? Math.round(parseFloat(priceRaw) * 100) : undefined;

  if (priceCents !== undefined && (Number.isNaN(priceCents) || priceCents < 0)) {
    return { error: "Invalid price" };
  }

  const result = await updatePublishedMenuItem(restaurantId, itemId, {
    name: name ?? undefined,
    description,
    priceCents,
    dietaryType: dietaryType as DietaryType | undefined,
    isAvailable,
    isPopular,
    isSpecial,
    tags,
  });

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/menu/edit`);
  revalidatePath(`/r`);
  return { success: "Item updated" };
}

export async function uploadMenuItemImageAction(
  restaurantId: string,
  itemId: string,
  formData: FormData,
): Promise<EditorActionState & { imageUrl?: string }> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image" };
  }

  const result = await uploadMenuItemImage(restaurantId, itemId, file);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/menu/edit`);
  revalidatePath(`/r`);
  return { success: "Image uploaded", imageUrl: result.imageUrl };
}

export async function createCategoryAction(
  restaurantId: string,
  formData: FormData,
): Promise<EditorActionState> {
  const name = formData.get("name")?.toString() ?? "";
  const result = await createPublishedCategory(restaurantId, name);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/menu/edit`);
  revalidatePath(`/r`);
  return { success: "Category created" };
}

export async function deleteCategoryAction(
  restaurantId: string,
  categoryId: string,
): Promise<EditorActionState> {
  const result = await deletePublishedCategory(restaurantId, categoryId);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/menu/edit`);
  revalidatePath(`/r`);
  return { success: "Category deleted" };
}

export async function reorderCategoriesAction(
  restaurantId: string,
  orderedIds: string[],
): Promise<EditorActionState> {
  const result = await reorderMenuCategories(restaurantId, orderedIds);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/menu/edit`);
  revalidatePath(`/r`);
  return { success: "Order saved" };
}

export async function createMenuItemAction(
  restaurantId: string,
  categoryId: string,
  formData: FormData,
): Promise<EditorActionState> {
  const name = formData.get("name")?.toString() ?? "";
  const priceRaw = formData.get("priceCents")?.toString() ?? "0";
  const description = formData.get("description")?.toString();
  const dietaryType = formData.get("dietaryType")?.toString() as DietaryType;
  const priceCents = Math.round(parseFloat(priceRaw) * 100);

  const result = await createPublishedMenuItem(restaurantId, categoryId, {
    name,
    priceCents,
    description,
    dietaryType,
  });

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/menu/edit`);
  revalidatePath(`/r`);
  return { success: "Item added" };
}

export async function deleteMenuItemAction(
  restaurantId: string,
  itemId: string,
): Promise<EditorActionState> {
  const result = await deletePublishedMenuItem(restaurantId, itemId);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/menu/edit`);
  revalidatePath(`/r`);
  return { success: "Item deleted" };
}

export async function reorderItemsAction(
  restaurantId: string,
  categoryId: string,
  orderedIds: string[],
): Promise<EditorActionState> {
  const result = await reorderMenuItems(restaurantId, categoryId, orderedIds);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/menu/edit`);
  revalidatePath(`/r`);
  return { success: "Order saved" };
}

export async function updateSettingsAction(
  restaurantId: string,
  formData: FormData,
): Promise<EditorActionState> {
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();
  const primaryColor = formData.get("primaryColor")?.toString();
  const city = formData.get("city")?.toString();
  const smartSuggestionsEnabled = formData.get("smartSuggestionsEnabled") === "on";
  const orderingEnabled = formData.get("orderingEnabled") === "on";
  const rewardsEnabled = formData.get("rewardsEnabled") === "on";

  const result = await updateRestaurantSettings(restaurantId, {
    name: name ?? undefined,
    description: description ?? undefined,
    primaryColor: primaryColor ?? undefined,
    city: city ?? undefined,
    smartSuggestionsEnabled,
    orderingEnabled,
    rewardsEnabled,
  });

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/settings`);
  return { success: "Settings saved" };
}

export async function createTableAction(
  restaurantId: string,
  formData: FormData,
): Promise<EditorActionState> {
  const label = formData.get("label")?.toString() ?? "";
  const zone = formData.get("zone")?.toString();

  const result = await createRestaurantTable(restaurantId, { label, zone });

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/settings`);
  return { success: "Table created" };
}

export async function createTablesBulkAction(
  restaurantId: string,
  formData: FormData,
): Promise<EditorActionState> {
  const prefix = formData.get("prefix")?.toString() ?? "";
  const from = Number.parseInt(formData.get("from")?.toString() ?? "1", 10);
  const to = Number.parseInt(formData.get("to")?.toString() ?? "1", 10);
  const zone = formData.get("zone")?.toString();

  const result = await createRestaurantTablesBulk(restaurantId, {
    prefix,
    from,
    to,
    zone,
  });

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/settings`);
  return { success: `Created ${result.count} tables` };
}

export async function updateTableAction(
  restaurantId: string,
  tableId: string,
  formData: FormData,
): Promise<EditorActionState> {
  const label = formData.get("label")?.toString();
  const zone = formData.get("zone")?.toString();
  const isActive = formData.get("isActive") === "on";

  const result = await updateRestaurantTable(restaurantId, tableId, {
    label: label ?? undefined,
    zone: zone ?? null,
    isActive,
  });

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/settings`);
  return { success: "Table updated" };
}

export async function deleteTableAction(
  restaurantId: string,
  tableId: string,
): Promise<EditorActionState> {
  const result = await deleteRestaurantTable(restaurantId, tableId);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}/settings`);
  return { success: "Table removed" };
}
