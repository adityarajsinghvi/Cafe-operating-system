import { NextResponse } from "next/server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { query, items } = body ?? {};

  if (!query || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ids: [] });
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    // Fallback: simple keyword match
    const q = String(query).toLowerCase();
    const ids = items
      .filter((item: { name: string; description?: string; dietaryType?: string; tags?: string[] }) => {
        const text = `${item.name} ${item.description ?? ""} ${item.dietaryType ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase();
        return text.includes(q);
      })
      .map((item: { id: string }) => item.id);
    return NextResponse.json({ ids });
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  });

  const catalog = items
    .map((item: { id: string; name: string; description?: string; dietaryType?: string; tags?: string[] }) =>
      `${item.id}: ${item.name}${item.description ? " — " + item.description : ""}${item.dietaryType ? " [" + item.dietaryType + "]" : ""}${item.tags?.length ? " tags:" + item.tags.join(",") : ""}`,
    )
    .join("\n");

  const prompt = `You are a cafe menu search assistant. A customer searched: "${query}"\n\nMenu items:\n${catalog}\n\nReturn a JSON object with key "ids" containing an array of item IDs (from the list above) that best match the customer's query. Include semantically relevant items, not just keyword matches. Return at most 20 IDs. If nothing matches, return an empty array. Example: {"ids":["uuid1","uuid2"]}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    const ids = Array.isArray(parsed?.ids) ? parsed.ids.filter((id: unknown) => typeof id === "string") : [];
    return NextResponse.json({ ids });
  } catch {
    return NextResponse.json({ ids: [] });
  }
}
