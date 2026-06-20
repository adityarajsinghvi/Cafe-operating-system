import { GoogleGenerativeAI } from "@google/generative-ai";
import type { WeatherSnapshot } from "@/lib/weather/open-meteo";

export interface ContextualSuggestion {
  emoji: string;
  headline: string;
  itemName: string;
  reason: string;
  isPersonalized: boolean;
}

interface SuggestionInput {
  weather: WeatherSnapshot;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  menuItemNames: string[]; // all available item names for the restaurant
  tasteProfile?: { top_items: string[] } | null; // customer's known preferences
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

// Detect if customer's usual items conflict with current weather
function detectConflict(
  tasteTopItems: string[],
  weather: WeatherSnapshot,
): { conflictItem: string | null; isConflict: boolean } {
  const cold = weather.tempC <= 20 || ["rainy", "drizzle", "cloudy", "foggy", "thunderstorm", "snowy"].includes(weather.condition);
  const hot = weather.tempC >= 32 || weather.condition === "sunny";

  const coldItems = ["cold coffee", "cold brew", "iced", "frappe", "milkshake", "smoothie", "juice", "lemonade", "cold"];
  const hotItems = ["hot chocolate", "soup", "masala chai", "chai", "hot coffee", "cappuccino", "latte", "espresso", "herbal tea"];

  for (const item of tasteTopItems) {
    const lower = item.toLowerCase();
    if (cold && coldItems.some((k) => lower.includes(k))) {
      return { conflictItem: item, isConflict: true };
    }
    if (hot && hotItems.some((k) => lower.includes(k))) {
      return { conflictItem: item, isConflict: true };
    }
  }
  return { conflictItem: null, isConflict: false };
}

export async function generateContextualSuggestion(
  input: SuggestionInput,
): Promise<ContextualSuggestion | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const timeOfDay = getTimeOfDay();
  const { weather, menuItemNames, tasteProfile } = input;

  const topItems = tasteProfile?.top_items ?? [];
  const { conflictItem, isConflict } = topItems.length
    ? detectConflict(topItems, weather)
    : { conflictItem: null, isConflict: false };

  const menuList = menuItemNames.slice(0, 40).join(", ");

  let personalizationContext = "";
  if (isConflict && conflictItem) {
    personalizationContext = `
The customer usually orders "${conflictItem}" but the current weather (${weather.label}) conflicts with that choice.
Write the suggestion acknowledging their usual order but recommending a more fitting alternative from the menu.
Use a warm, friendly tone like: "We know you love your [X], but it's [weather] — want to try [Y] instead?"`;
  } else if (topItems.length > 0) {
    personalizationContext = `The customer's usual favourites are: ${topItems.slice(0, 3).join(", ")}. You can reference this subtly if relevant.`;
  }

  const prompt = `You are a smart cafe suggestion engine for an Indian cafe. Given the current context, pick ONE item from the menu and write a concise, warm suggestion for the customer.

Context:
- Weather: ${weather.label}
- Time of day: ${timeOfDay}
- Available menu items: ${menuList}
${personalizationContext}

Rules:
- Pick ONLY an item that exists in the menu list above (exact name)
- The suggestion must feel natural, not like an ad
- Headline: short, punchy (max 8 words)
- Reason: one sentence, conversational, relevant to weather or time
- Emoji: one fitting emoji for the suggested item
- isPersonalized: true only if you referenced the customer's taste profile or conflict

Respond with valid JSON only, no markdown:
{
  "emoji": "☕",
  "headline": "Perfect for a rainy afternoon",
  "itemName": "Masala Chai",
  "reason": "Nothing beats a warm, spiced chai when it's drizzling outside.",
  "isPersonalized": false
}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Match the same config pattern as the working gemini-provider.ts
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 300,
        temperature: 0.8,
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip markdown code fences if the model wraps the JSON
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean);
    if (!parsed.emoji || !parsed.headline || !parsed.itemName || !parsed.reason) return null;
    return parsed as ContextualSuggestion;
  } catch (err) {
    console.error("[contextual-suggestion] Gemini error:", err);
    return null;
  }
}

export { getTimeOfDay };
