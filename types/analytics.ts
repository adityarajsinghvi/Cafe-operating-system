import { z } from "zod";

export const analyticsRangeSchema = z.enum(["today", "7d", "30d", "90d"]);
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  today: "Today",
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
};

export interface AnalyticsKpis {
  revenueCents: number;
  revenueDeltaPct: number | null;
  orderCount: number;
  orderCountDeltaPct: number | null;
  avgOrderValueCents: number;
  avgOrderValueDeltaPct: number | null;
  repeatCustomerRatePct: number | null;
}

export interface RevenuePoint {
  date: string; // YYYY-MM-DD
  revenueCents: number;
  orderCount: number;
}

export interface PeakHourCell {
  dayOfWeek: number; // 0 = Sunday
  hour: number; // 0-23
  orderCount: number;
}

export interface MenuItemPerformance {
  menuItemId: string;
  name: string;
  ordersCount: number;
  quantitySold: number;
  revenueCents: number;
  revenueSharePct: number;
  isAvailable: boolean;
  isPopular: boolean;
  isSpecial: boolean;
  createdAt: string;
}

export interface CustomerSegments {
  newCount: number;
  returningCount: number;
  repeatRatePct: number | null;
  atRisk: Array<{
    id: string;
    name: string | null;
    phone: string;
    visitCount: number;
    daysSinceLastVisit: number;
  }>;
}

export interface TableTurnover {
  tableId: string;
  label: string;
  sessionCount: number;
  avgSessionMinutes: number | null;
}

export interface AnalyticsOverview {
  range: AnalyticsRange;
  kpis: AnalyticsKpis;
  revenueTrend: RevenuePoint[];
  peakHours: PeakHourCell[];
  topItems: MenuItemPerformance[];
  bottomItems: MenuItemPerformance[];
  customerSegments: CustomerSegments;
  tableTurnover: TableTurnover[];
  currency: string;
  hasAnyData: boolean;
}

export type MenuInsightType = "cut" | "promote" | "watch";

export interface MenuInsight {
  type: MenuInsightType;
  itemName: string;
  message: string;
}

export interface MenuInsightsResult {
  summary: string;
  insights: MenuInsight[];
}

export interface MenuInsightsState {
  result: MenuInsightsResult | null;
  refreshedAt: string | null;
  insufficientData: boolean;
}
