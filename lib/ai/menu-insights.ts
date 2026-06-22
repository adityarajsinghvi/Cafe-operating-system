import { GoogleGenerativeAI } from "@google/generative-ai";

import type { MenuInsight, MenuInsightsResult } from "@/types/analytics";

const LOOKBACK_DAYS = 30;
export const MIN_ORDERS_FOR_INSIGHTS = 15;
const MIN_DAYS_ON_MENU_FOR_CUT = 14;
const MAX_CANDIDATES = 6;

interface Candidate {
  type: "cut" | "promote";
  itemName: string;
  stat: string;
}

interface CandidateData {
  candidates: Candidate[];
  billableOrderCount: number;
  servedOrderCount: number;
}

// Deterministic pass over real sales data — decides WHICH items are worth
// flagging. The LLM only ever phrases what we've already decided; it never
// picks the item or the verdict itself, so it can't hallucinate a "remove X"
// recommendation that isn't backed by real numbers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function collectInsightCandidates(admin: any, restaurantId: string): Promise<CandidateData> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [{ data: menuItems }, { data: orders }] = await Promise.all([
    admin
      .from("menu_items")
      .select("id, name, is_available, is_popular, is_special, created_at")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true),
    admin
      .from("orders")
      .select("id, status, created_at")
      .eq("restaurant_id", restaurantId)
      .neq("status", "cancelled")
      .gte("created_at", since.toISOString()),
  ]);

  const items = (menuItems ?? []) as Array<{
    id: string;
    name: string;
    is_popular: boolean;
    is_special: boolean;
    created_at: string;
  }>;
  const orderRows = (orders ?? []) as Array<{ id: string; status: string; created_at: string }>;
  const billableOrderCount = orderRows.length;
  const servedOrderCount = orderRows.filter((o) => o.status === "served").length;

  if (billableOrderCount < MIN_ORDERS_FOR_INSIGHTS) {
    return { candidates: [], billableOrderCount, servedOrderCount };
  }

  const orderIds = orderRows.map((o) => o.id);
  const { data: orderItems } = await admin
    .from("order_items")
    .select("menu_item_id, quantity, price_cents")
    .in("order_id", orderIds);

  const perf = new Map<string, { quantitySold: number; revenueCents: number }>();
  let totalRevenueCents = 0;
  for (const oi of (orderItems ?? []) as Array<{
    menu_item_id: string | null;
    quantity: number;
    price_cents: number;
  }>) {
    if (!oi.menu_item_id) continue;
    const lineRevenue = oi.price_cents * oi.quantity;
    const entry = perf.get(oi.menu_item_id) ?? { quantitySold: 0, revenueCents: 0 };
    entry.quantitySold += oi.quantity;
    entry.revenueCents += lineRevenue;
    perf.set(oi.menu_item_id, entry);
    totalRevenueCents += lineRevenue;
  }

  const now = Date.now();
  const ranked = items.map((item) => {
    const entry = perf.get(item.id);
    const quantitySold = entry?.quantitySold ?? 0;
    const revenueCents = entry?.revenueCents ?? 0;
    const revenueSharePct = totalRevenueCents > 0 ? (revenueCents / totalRevenueCents) * 100 : 0;
    const daysOnMenu = Math.floor((now - new Date(item.created_at).getTime()) / 86400000);
    return { item, quantitySold, revenueSharePct, daysOnMenu };
  });

  const cutCandidates: Candidate[] = ranked
    .filter((r) => r.daysOnMenu >= MIN_DAYS_ON_MENU_FOR_CUT && (r.quantitySold === 0 || r.revenueSharePct < 1))
    .sort((a, b) => a.quantitySold - b.quantitySold)
    .slice(0, 4)
    .map((r) => ({
      type: "cut" as const,
      itemName: r.item.name,
      stat:
        r.quantitySold === 0
          ? `0 orders in the last ${LOOKBACK_DAYS} days (on the menu for ${r.daysOnMenu} days)`
          : `only ${r.quantitySold} sold in ${LOOKBACK_DAYS} days, ${r.revenueSharePct.toFixed(1)}% of revenue`,
    }));

  const promoteCandidates: Candidate[] = ranked
    .filter((r) => !r.item.is_popular && !r.item.is_special && r.revenueSharePct > 0)
    .sort((a, b) => b.revenueSharePct - a.revenueSharePct)
    .slice(0, 3)
    .map((r) => ({
      type: "promote" as const,
      itemName: r.item.name,
      stat: `${r.revenueSharePct.toFixed(1)}% of total revenue, ${r.quantitySold} sold, not currently flagged Popular/Special`,
    }));

  const candidates = [...cutCandidates, ...promoteCandidates].slice(0, MAX_CANDIDATES);
  return { candidates, billableOrderCount, servedOrderCount };
}

export async function writeInsightsNarrative(
  candidates: Candidate[],
  billableOrderCount: number,
): Promise<MenuInsightsResult | null> {
  if (candidates.length === 0) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const candidateList = candidates
    .map((c, i) => `${i}. [${c.type}] "${c.itemName}" — ${c.stat}`)
    .join("\n");

  const prompt = `You are writing short, plain-language notes for a cafe owner reviewing their menu's last ${LOOKBACK_DAYS} days (${billableOrderCount} orders total).

Below is a list of menu items we have already decided are worth flagging, with the type already determined ("cut" = underperforming, consider removing; "promote" = strong earner, consider featuring more). Do NOT change the type or pick different items — only write the message for each one, in the exact order given.

Items:
${candidateList}

Rules:
- One short, specific, friendly sentence per item (max 18 words), referencing the real stat given.
- "cut" messages should gently suggest removing or reconsidering the item, citing the real number.
- "promote" messages should suggest featuring/highlighting the item, citing the real number.
- Also write a one-sentence "summary" of overall menu health in plain language.

Respond with valid JSON only, no markdown:
{
  "summary": "string",
  "messages": ["string", "string", ...]
}
The "messages" array must have exactly ${candidates.length} entries, in the same order as the items above.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 400,
        temperature: 0.4,
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean) as { summary: string; messages: string[] };

    if (!parsed.summary || !Array.isArray(parsed.messages) || parsed.messages.length !== candidates.length) {
      return null;
    }

    const insights: MenuInsight[] = candidates.map((c, i) => ({
      type: c.type,
      itemName: c.itemName,
      message: parsed.messages[i],
    }));

    return { summary: parsed.summary, insights };
  } catch (err) {
    console.error("[menu-insights] Gemini error:", err);
    return null;
  }
}
