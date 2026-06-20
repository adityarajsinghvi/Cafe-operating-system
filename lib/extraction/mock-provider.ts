import { randomUUID } from "crypto";

import type { MenuExtractionProvider } from "@/lib/extraction/types";
import { menuDraftPayloadSchema } from "@/types/menu";

export const mockMenuExtractionProvider: MenuExtractionProvider = {
  name: "mock",

  async extract() {
    const payload = menuDraftPayloadSchema.parse({
      categories: [
        {
          id: "starters",
          name: "Starters",
          items: [
            {
              id: "paneer-tikka",
              name: "Paneer Tikka",
              description: "Char-grilled cottage cheese with spices",
              priceCents: 28000,
              dietaryType: "veg",
              addons: [],
              isAvailable: true,
            },
            {
              id: "chicken-tikka",
              name: "Chicken Tikka",
              description: "Tandoori marinated chicken pieces",
              priceCents: 32000,
              dietaryType: "non_veg",
              addons: [],
              isAvailable: true,
            },
          ],
        },
        {
          id: "main-course",
          name: "Main Course",
          items: [
            {
              id: "dal-makhani",
              name: "Dal Makhani",
              description: "Slow-cooked black lentils in cream",
              priceCents: 26000,
              dietaryType: "veg",
              addons: ["Extra butter"],
              isAvailable: true,
            },
            {
              id: "butter-chicken",
              name: "Butter Chicken",
              description: "Classic tomato and butter gravy",
              priceCents: 38000,
              dietaryType: "non_veg",
              addons: [],
              isPopular: true,
              isAvailable: true,
            },
          ],
        },
        {
          id: "beverages",
          name: "Beverages",
          items: [
            {
              id: "mango-lassi",
              name: "Mango Lassi",
              description: "Chilled yogurt drink",
              priceCents: 12000,
              dietaryType: "veg",
              addons: [],
              isAvailable: true,
            },
            {
              id: "masala-chai",
              name: "Masala Chai",
              description: "Spiced Indian tea",
              priceCents: 8000,
              dietaryType: "veg",
              addons: [],
              isAvailable: true,
            },
          ],
        },
      ],
    });

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Ensure unique ids if re-run
    return {
      categories: payload.categories.map((category) => ({
        ...category,
        id: `${category.id}-${randomUUID().slice(0, 8)}`,
        items: category.items.map((item) => ({
          ...item,
          id: `${item.id}-${randomUUID().slice(0, 8)}`,
        })),
      })),
    };
  },
};
