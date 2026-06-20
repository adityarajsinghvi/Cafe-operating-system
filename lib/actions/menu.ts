"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  publishMenuFromDraft,
  updateMenuDraft,
} from "@/services/menu.service";
import { menuDraftPayloadSchema } from "@/types/menu";

export type MenuActionState = {
  error?: string;
  success?: string;
};

export async function updateMenuDraftAction(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const restaurantId = formData.get("restaurantId")?.toString();
  const draftId = formData.get("draftId")?.toString();
  const payloadRaw = formData.get("payload")?.toString();

  if (!restaurantId || !draftId || !payloadRaw) {
    return { error: "Missing required fields" };
  }

  try {
    const payload = menuDraftPayloadSchema.parse(JSON.parse(payloadRaw));
    const result = await updateMenuDraft(draftId, restaurantId, payload);

    if ("error" in result && result.error) {
      return { error: result.error };
    }

    revalidatePath(`/dashboard/${restaurantId}/menu`);
    return { success: "Draft saved" };
  } catch {
    return { error: "Invalid menu data" };
  }
}

export async function publishMenuAction(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const restaurantId = formData.get("restaurantId")?.toString();
  const draftId = formData.get("draftId")?.toString();

  if (!restaurantId || !draftId) {
    return { error: "Missing required fields" };
  }

  const result = await publishMenuFromDraft(draftId, restaurantId);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/${restaurantId}`);
  revalidatePath(`/dashboard/${restaurantId}/menu`);
  redirect(`/dashboard/${restaurantId}/menu?published=1`);
}
