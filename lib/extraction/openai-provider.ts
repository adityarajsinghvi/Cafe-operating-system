import OpenAI from "openai";

import {
  MENU_EXTRACTION_JSON_SCHEMA,
  MENU_EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/extraction/prompt";
import type {
  MenuExtractionInput,
  MenuExtractionProvider,
} from "@/lib/extraction/types";
import { menuDraftPayloadSchema } from "@/types/menu";

export function createOpenAIMenuExtractionProvider(): MenuExtractionProvider {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });

  return {
    name: "openai",

    async extract(input: MenuExtractionInput) {
      const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];

      if (input.textContent?.length) {
        const combined = input.textContent
          .map((block) => `### ${block.label ?? "Source"}\n${block.text}`)
          .join("\n\n");
        userContent.push({
          type: "text",
          text: `Menu text content:\n\n${combined}`,
        });
      }

      if (input.images?.length) {
        for (const image of input.images) {
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:${image.mimeType};base64,${image.base64}`,
              detail: "high",
            },
          });
        }
      }

      if (!userContent.length) {
        throw new Error("No menu content provided for extraction");
      }

      userContent.unshift({
        type: "text",
        text: `Extract the full menu. Currency: ${input.currency ?? "INR"}. For INR prices shown as whole rupees (e.g. 250), store priceCents as 25000.`,
      });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.1,
        response_format: {
          type: "json_schema",
          json_schema: MENU_EXTRACTION_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: MENU_EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      });

      const raw = response.choices[0]?.message?.content;

      if (!raw) {
        throw new Error("AI returned an empty menu extraction result");
      }

      return menuDraftPayloadSchema.parse(JSON.parse(raw));
    },
  };
}
