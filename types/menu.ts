import { z } from "zod";

export const dietaryTypeSchema = z.enum([
  "veg",
  "non_veg",
  "egg",
  "vegan",
  "unknown",
]);

export const draftMenuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  priceCents: z.number().int().min(0),
  dietaryType: dietaryTypeSchema.default("unknown"),
  addons: z.array(z.string()).optional().default([]),
  isPopular: z.boolean().optional().default(false),
  isSpecial: z.boolean().optional().default(false),
  isAvailable: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
});

export const draftMenuCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  items: z.array(draftMenuItemSchema),
});

export const menuDraftPayloadSchema = z.object({
  categories: z.array(draftMenuCategorySchema),
});

export const menuDraftSummarySchema = z.object({
  categoryCount: z.number().int().min(0),
  itemCount: z.number().int().min(0),
  vegCount: z.number().int().min(0),
  beverageCount: z.number().int().min(0),
});

export type DietaryType = z.infer<typeof dietaryTypeSchema>;
export type DraftMenuItem = z.infer<typeof draftMenuItemSchema>;
export type DraftMenuCategory = z.infer<typeof draftMenuCategorySchema>;
export type MenuDraftPayload = z.infer<typeof menuDraftPayloadSchema>;
export type MenuDraftSummary = z.infer<typeof menuDraftSummarySchema>;

export function computeMenuSummary(
  payload: MenuDraftPayload,
): MenuDraftSummary {
  const beveragePattern =
    /beverage|drink|juice|coffee|tea|shake|lassi|mocktail|cocktail|soda|water/i;

  let itemCount = 0;
  let vegCount = 0;
  let beverageCount = 0;

  for (const category of payload.categories) {
    if (beveragePattern.test(category.name)) {
      beverageCount += category.items.length;
    }

    for (const item of category.items) {
      itemCount += 1;
      if (item.dietaryType === "veg" || item.dietaryType === "vegan") {
        vegCount += 1;
      }
    }
  }

  return {
    categoryCount: payload.categories.length,
    itemCount,
    vegCount,
    beverageCount,
  };
}

export function createEmptyDraft(): MenuDraftPayload {
  return { categories: [] };
}
