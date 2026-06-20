import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";

import { MENU_EXTRACTION_SYSTEM_PROMPT } from "@/lib/extraction/prompt";
import type {
  MenuExtractionInput,
  MenuExtractionProvider,
} from "@/lib/extraction/types";
import { menuDraftPayloadSchema } from "@/types/menu";

const GEMINI_MENU_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    categories: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                name: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                priceCents: { type: SchemaType.INTEGER },
                dietaryType: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["veg", "non_veg", "egg", "vegan", "unknown"],
                },
                addons: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
                isPopular: { type: SchemaType.BOOLEAN },
                isSpecial: { type: SchemaType.BOOLEAN },
                isAvailable: { type: SchemaType.BOOLEAN },
              },
              required: ["id", "name", "priceCents", "dietaryType"],
            },
          },
        },
        required: ["id", "name", "items"],
      },
    },
  },
  required: ["categories"],
};

export function createGeminiMenuExtractionProvider(): MenuExtractionProvider {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const client = new GoogleGenerativeAI(apiKey);

  return {
    name: "gemini",

    async extract(input: MenuExtractionInput) {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: MENU_EXTRACTION_SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: GEMINI_MENU_SCHEMA,
        },
      });

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [
        {
          text: `Extract the full menu. Currency: ${input.currency ?? "INR"}. For INR prices shown as whole rupees (e.g. 250), store priceCents as 25000.`,
        },
      ];

      if (input.textContent?.length) {
        const combined = input.textContent
          .map((block) => `### ${block.label ?? "Source"}\n${block.text}`)
          .join("\n\n");
        parts.push({ text: `Menu text content:\n\n${combined}` });
      }

      if (input.images?.length) {
        for (const image of input.images) {
          parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.base64,
            },
          });
        }
      }

      if (parts.length <= 1 && !input.images?.length) {
        throw new Error("No menu content provided for extraction");
      }

      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      const raw = result.response.text();

      if (!raw) {
        throw new Error("Gemini returned an empty menu extraction result");
      }

      return menuDraftPayloadSchema.parse(JSON.parse(raw));
    },
  };
}
