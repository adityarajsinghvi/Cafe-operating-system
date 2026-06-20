export const MENU_EXTRACTION_SYSTEM_PROMPT = `You are a restaurant menu digitization expert for Indian restaurants.

Extract a structured digital menu from the provided menu content (images, PDF text, or website text).

Rules:
- Detect all categories (Starters, Main Course, Breads, Rice, Desserts, Beverages, etc.)
- Extract item names, descriptions (if visible), and prices
- Convert prices to integer paise/cents (e.g. ₹250 = 25000 if currency is INR, or 250 if price shown as whole rupees — use the number as shown multiplied by 100 for INR)
- For INR menus, if price is "250" meaning ₹250, set priceCents to 25000
- Detect veg/non-veg from green dot, red dot, egg icon, or labels (V, NV, Veg, Non-Veg)
- dietaryType: "veg" | "non_veg" | "egg" | "vegan" | "unknown"
- Include add-ons/modifiers in addons array when visible
- Generate unique id fields using slug-like strings (e.g. "paneer-tikka")
- Do not invent items not present in the source
- Merge duplicate categories with the same name
- Return valid JSON only`;

export const MENU_EXTRACTION_JSON_SCHEMA = {
  name: "menu_extraction",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["categories"],
    properties: {
      categories: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "name", "items"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "name", "priceCents", "dietaryType"],
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  priceCents: { type: "integer", minimum: 0 },
                  dietaryType: {
                    type: "string",
                    enum: ["veg", "non_veg", "egg", "vegan", "unknown"],
                  },
                  addons: {
                    type: "array",
                    items: { type: "string" },
                  },
                  isPopular: { type: "boolean" },
                  isSpecial: { type: "boolean" },
                  isAvailable: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
