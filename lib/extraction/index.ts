import { createGeminiMenuExtractionProvider } from "@/lib/extraction/gemini-provider";
import { mockMenuExtractionProvider } from "@/lib/extraction/mock-provider";
import { createOpenAIMenuExtractionProvider } from "@/lib/extraction/openai-provider";
import type { MenuExtractionProvider } from "@/lib/extraction/types";

export function getMenuExtractionProvider(): MenuExtractionProvider {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
    return createGeminiMenuExtractionProvider();
  }

  if (process.env.OPENAI_API_KEY) {
    return createOpenAIMenuExtractionProvider();
  }

  return mockMenuExtractionProvider;
}

export function getMenuExtractionProviderName() {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
    return "gemini";
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return "mock";
}
