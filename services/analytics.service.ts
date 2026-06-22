import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import type {
  AnalyticsOverview,
  AnalyticsRange,
  CustomerSegments,
  MenuItemPerformance,
  PeakHourCell,
  RevenuePoint,
  TableTurnover,
} from "@/types/analytics";

async function requireRestaurantAccess(restaurantId: string) {
  const auth = await createAuthenticatedClient();
  const admin = createAdminClient();
  if (!auth || !admin) return null;

  const { data: membership } = await admin
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { admin: admin as any };
}

const RANGE_MS: Record<AnalyticsRange, number> = {
  today: 0, // handled specially below (start of today)
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

function rangeStart(range: AnalyticsRange, now: Date): Date {
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getTime() - RANGE_MS[range]);
}

interface OrderRow {
  id: string;
  customer_id: string | null;
  table_session_id: string | null;
  status: string;
  subtotal_cents: number;
  created_at: string;
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return ((current - previous) / previous) * 100;
}

export async function getAnalyticsOverview(
  restaurantId: string,
  range: AnalyticsRange,
): Promise<AnalyticsOverview | null> {
  const ctx = await requireRestaurantAccess(restaurantId);
  if (!ctx) return null;

  const now = new Date();
  const since = rangeStart(range, now);
  const durationMs = now.getTime() - since.getTime();
  const previousSince = new Date(since.getTime() - durationMs);

  const [{ data: restaurant }, { data: orders }, { data: tableSessions }, { data: tables }] =
    await Promise.all([
      ctx.admin.from("restaurants").select("currency").eq("id", restaurantId).single(),
      ctx.admin
        .from("orders")
        .select("id, customer_id, table_session_id, status, subtotal_cents, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", previousSince.toISOString()) as Promise<{ data: OrderRow[] | null }>,
      ctx.admin
        .from("table_sessions")
        .select("id, table_id, created_at, closed_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", since.toISOString()),
      ctx.admin.from("restaurant_tables").select("id, label").eq("restaurant_id", restaurantId),
    ]);

  const currency = restaurant?.currency ?? "INR";
  const allOrders = (orders ?? []) as OrderRow[];

  const currentOrders = allOrders.filter((o) => o.created_at >= since.toISOString());
  const previousOrders = allOrders.filter((o) => o.created_at < since.toISOString());

  const billable = (list: OrderRow[]) => list.filter((o) => o.status !== "cancelled");

  const curBillable = billable(currentOrders);
  const prevBillable = billable(previousOrders);

  const revenueCents = curBillable.reduce((s, o) => s + o.subtotal_cents, 0);
  const prevRevenueCents = prevBillable.reduce((s, o) => s + o.subtotal_cents, 0);
  const orderCount = curBillable.length;
  const prevOrderCount = prevBillable.length;
  const avgOrderValueCents = orderCount ? Math.round(revenueCents / orderCount) : 0;
  const prevAvgOrderValueCents = prevOrderCount ? Math.round(prevRevenueCents / prevOrderCount) : 0;

  // ── Revenue trend (daily buckets) ──
  const dayBuckets = new Map<string, { revenueCents: number; orderCount: number }>();
  for (const o of curBillable) {
    const day = o.created_at.slice(0, 10);
    const bucket = dayBuckets.get(day) ?? { revenueCents: 0, orderCount: 0 };
    bucket.revenueCents += o.subtotal_cents;
    bucket.orderCount += 1;
    dayBuckets.set(day, bucket);
  }
  const revenueTrend: RevenuePoint[] = [];
  const cursor = new Date(since);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= now) {
    const key = cursor.toISOString().slice(0, 10);
    const bucket = dayBuckets.get(key);
    revenueTrend.push({
      date: key,
      revenueCents: bucket?.revenueCents ?? 0,
      orderCount: bucket?.orderCount ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Peak hours heatmap ──
  const hourBuckets = new Map<string, number>();
  for (const o of curBillable) {
    const d = new Date(o.created_at);
    const key = `${d.getDay()}-${d.getHours()}`;
    hourBuckets.set(key, (hourBuckets.get(key) ?? 0) + 1);
  }
  const peakHours: PeakHourCell[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      peakHours.push({ dayOfWeek: dow, hour, orderCount: hourBuckets.get(`${dow}-${hour}`) ?? 0 });
    }
  }

  // ── Menu item performance (best/worst sellers) ──
  const orderIds = curBillable.map((o) => o.id);
  const { topItems, bottomItems } = await getMenuItemPerformanceInternal(
    ctx.admin,
    restaurantId,
    orderIds,
    revenueCents,
  );

  // ── Customer segments + at-risk regulars ──
  const customerSegments = await getCustomerSegmentsInternal(ctx.admin, restaurantId, since);

  // ── Table turnover ──
  const sessionsByTable = new Map<string, { count: number; totalMinutes: number; withDuration: number }>();
  for (const s of (tableSessions ?? []) as Array<{
    id: string;
    table_id: string | null;
    created_at: string;
    closed_at: string | null;
  }>) {
    if (!s.table_id) continue;
    const entry = sessionsByTable.get(s.table_id) ?? { count: 0, totalMinutes: 0, withDuration: 0 };
    entry.count += 1;
    if (s.closed_at) {
      const minutes = (new Date(s.closed_at).getTime() - new Date(s.created_at).getTime()) / 60000;
      if (minutes > 0) {
        entry.totalMinutes += minutes;
        entry.withDuration += 1;
      }
    }
    sessionsByTable.set(s.table_id, entry);
  }
  const tableTurnover: TableTurnover[] = ((tables ?? []) as Array<{ id: string; label: string }>)
    .map((t) => {
      const entry = sessionsByTable.get(t.id);
      return {
        tableId: t.id,
        label: t.label,
        sessionCount: entry?.count ?? 0,
        avgSessionMinutes: entry && entry.withDuration > 0 ? Math.round(entry.totalMinutes / entry.withDuration) : null,
      };
    })
    .sort((a, b) => b.sessionCount - a.sessionCount);

  return {
    range,
    kpis: {
      revenueCents,
      revenueDeltaPct: pct(revenueCents, prevRevenueCents),
      orderCount,
      orderCountDeltaPct: pct(orderCount, prevOrderCount),
      avgOrderValueCents,
      avgOrderValueDeltaPct: pct(avgOrderValueCents, prevAvgOrderValueCents),
      repeatCustomerRatePct: customerSegments.repeatRatePct,
    },
    revenueTrend,
    peakHours,
    topItems,
    bottomItems,
    customerSegments,
    tableTurnover,
    currency,
    hasAnyData: allOrders.length > 0,
  };
}

async function getMenuItemPerformanceInternal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  restaurantId: string,
  orderIds: string[],
  totalRevenueCents: number,
): Promise<{ topItems: MenuItemPerformance[]; bottomItems: MenuItemPerformance[] }> {
  const { data: menuItems } = await admin
    .from("menu_items")
    .select("id, name, is_available, is_popular, is_special, created_at")
    .eq("restaurant_id", restaurantId);

  const items = (menuItems ?? []) as Array<{
    id: string;
    name: string;
    is_available: boolean;
    is_popular: boolean;
    is_special: boolean;
    created_at: string;
  }>;

  const perf = new Map<string, { ordersCount: number; quantitySold: number; revenueCents: number }>();

  if (orderIds.length > 0) {
    const { data: orderItems } = await admin
      .from("order_items")
      .select("menu_item_id, quantity, price_cents")
      .in("order_id", orderIds);

    for (const oi of (orderItems ?? []) as Array<{
      menu_item_id: string | null;
      quantity: number;
      price_cents: number;
    }>) {
      if (!oi.menu_item_id) continue;
      const entry = perf.get(oi.menu_item_id) ?? { ordersCount: 0, quantitySold: 0, revenueCents: 0 };
      entry.ordersCount += 1;
      entry.quantitySold += oi.quantity;
      entry.revenueCents += oi.price_cents * oi.quantity;
      perf.set(oi.menu_item_id, entry);
    }
  }

  const all: MenuItemPerformance[] = items.map((item) => {
    const entry = perf.get(item.id);
    const revenueCents = entry?.revenueCents ?? 0;
    return {
      menuItemId: item.id,
      name: item.name,
      ordersCount: entry?.ordersCount ?? 0,
      quantitySold: entry?.quantitySold ?? 0,
      revenueCents,
      revenueSharePct: totalRevenueCents > 0 ? (revenueCents / totalRevenueCents) * 100 : 0,
      isAvailable: item.is_available,
      isPopular: item.is_popular,
      isSpecial: item.is_special,
      createdAt: item.created_at,
    };
  });

  const sorted = [...all].sort((a, b) => b.revenueCents - a.revenueCents);
  const topItems = sorted.slice(0, 10);
  const bottomItems = sorted
    .filter((i) => i.isAvailable)
    .slice(-10)
    .reverse();

  return { topItems, bottomItems };
}

async function getCustomerSegmentsInternal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  restaurantId: string,
  since: Date,
): Promise<CustomerSegments> {
  const { data: customers } = await admin
    .from("customers")
    .select("id, name, phone, visit_count, last_visit_at, created_at")
    .eq("restaurant_id", restaurantId);

  const all = (customers ?? []) as Array<{
    id: string;
    name: string | null;
    phone: string;
    visit_count: number;
    last_visit_at: string | null;
    created_at: string;
  }>;

  const activeInRange = all.filter((c) => c.last_visit_at && c.last_visit_at >= since.toISOString());
  const newCount = activeInRange.filter((c) => c.visit_count <= 1).length;
  const returningCount = activeInRange.filter((c) => c.visit_count > 1).length;
  const repeatRatePct =
    activeInRange.length > 0 ? (returningCount / activeInRange.length) * 100 : null;

  const now = Date.now();
  const atRisk = all
    .filter((c) => c.visit_count >= 3 && c.last_visit_at)
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      visitCount: c.visit_count,
      daysSinceLastVisit: Math.floor((now - new Date(c.last_visit_at as string).getTime()) / 86400000),
    }))
    .filter((c) => c.daysSinceLastVisit >= 21)
    .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit)
    .slice(0, 10);

  return { newCount, returningCount, repeatRatePct, atRisk };
}
