import { NextResponse } from "next/server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { getRuleBasedTags, mergeTags } from "@/lib/menu/tag-rules";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, description, dietaryType, existingTags = [] } = body ?? {};

  if (!name) {
    return NextResponse.json({ tags: [] });
  }

  const ruleTags = getRuleBasedTags(name, description, dietaryType);
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ tags: mergeTags(existingTags, ruleTags) });
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const prompt = `You are a cafe menu tagging assistant. Suggest 4-6 additional short tags for this menu item that customers would use to search for it. Focus on: flavor profile (spicy, sweet, tangy, creamy), cooking method (grilled, fried, baked), mood (comfort food, refreshing, indulgent), or occasion (breakfast, snack, dessert).

Menu item:
- Name: ${name}
- Description: ${description ?? "none"}
- Dietary type: ${dietaryType ?? "unknown"}

Return JSON: {"tags": ["tag1", "tag2", ...]}
Rules: lowercase only, 1-3 words each, max 6 tags, no duplicates with existing tags: [${[...existingTags, ...ruleTags].join(", ")}]`;

  try {
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    const aiTags: string[] = (parsed?.tags ?? [])
      .filter((t: unknown) => typeof t === "string" && t.length > 0)
      .map((t: string) => t.toLowerCase().trim())
      .slice(0, 6);
    return NextResponse.json({ tags: mergeTags(existingTags, ruleTags, aiTags) });
  } catch {
    return NextResponse.json({ tags: mergeTags(existingTags, ruleTags) });
  }
}
