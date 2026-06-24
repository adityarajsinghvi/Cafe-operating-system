"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Loader2,
  Megaphone,
  Minus,
  Phone,
  Receipt,
  Repeat2,
  Scissors,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import type {
  AnalyticsOverview,
  AnalyticsRange,
  ItemTimeSlot,
  MenuInsightsState,
} from "@/types/analytics";
import { ANALYTICS_RANGE_LABELS } from "@/types/analytics";

const RANGES: AnalyticsRange[] = ["today", "7d", "30d", "90d"];

function formatMoney(cents: number, currency: string) {
  const amount = Math.round(cents / 100);
  if (currency === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${currency} ${amount.toLocaleString()}`;
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;
  const up = pct >= 0;
  const Icon = pct === 0 ? Minus : up ? TrendingUp : TrendingDown;
  const color = pct === 0 ? "text-muted-foreground" : up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  deltaPct,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  deltaPct: number | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <div className="mt-0.5 flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <DeltaBadge pct={deltaPct} />
      </div>
    </div>
  );
}

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-semibold">{title}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BusiestHoursList({ cells }: { cells: AnalyticsOverview["peakHours"] }) {
  const byHour = cells.reduce<Record<number, number>>((acc, c) => {
    acc[c.hour] = (acc[c.hour] ?? 0) + c.orderCount;
    return acc;
  }, {});
  const sorted = Object.entries(byHour)
    .map(([h, count]) => ({ hour: Number(h), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const max = Math.max(1, sorted[0]?.count ?? 1);

  function formatHour(h: number) {
    const ampm = h < 12 ? "AM" : "PM";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}:00 ${ampm}`;
  }

  return (
    <div className="space-y-3">
      {sorted.map(({ hour, count }) => (
        <div key={hour} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{formatHour(hour)}</span>
            <span className="text-xs text-muted-foreground">{count} orders</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(count / max) * 100}%`, background: "#c96442" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PeakHoursHeatmap({ cells }: { cells: AnalyticsOverview["peakHours"] }) {
  const max = Math.max(1, ...cells.map((c) => c.orderCount));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[2px]">
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} className="text-center text-[9px] text-muted-foreground">
            {h % 3 === 0 ? h : ""}
          </div>
        ))}
        {days.map((day, dow) => (
          <Fragment key={day}>
            <div className="flex items-center text-[10px] text-muted-foreground">
              {day}
            </div>
            {Array.from({ length: 24 }).map((_, h) => {
              const cell = cells.find((c) => c.dayOfWeek === dow && c.hour === h);
              const intensity = cell ? cell.orderCount / max : 0;
              return (
                <div
                  key={`${dow}-${h}`}
                  title={`${day} ${h}:00 — ${cell?.orderCount ?? 0} orders`}
                  className="aspect-square rounded-[3px]"
                  style={{
                    background: intensity === 0 ? "var(--muted)" : `rgba(201,100,66,${0.15 + intensity * 0.85})`,
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function MenuItemRow({
  name,
  quantitySold,
  revenueCents,
  revenueSharePct,
  currency,
  tone,
}: {
  name: string;
  quantitySold: number;
  revenueCents: number;
  revenueSharePct: number;
  currency: string;
  tone: "top" | "bottom";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{quantitySold} sold · {revenueSharePct.toFixed(1)}% of revenue</p>
      </div>
      <p className={`shrink-0 text-sm font-semibold ${tone === "top" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
        {formatMoney(revenueCents, currency)}
      </p>
    </div>
  );
}

function ItemTimeTable({ rows, emptyText }: { rows: ItemTimeSlot[]; emptyText: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground shrink-0">{row.label}</span>
            <span className="truncate text-right text-sm font-semibold">{row.topItem}</span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(row.count / maxCount) * 100}%`, background: "#c96442" }}
            />
          </div>
          <p className="text-right text-[10px] text-muted-foreground">{row.count} sold</p>
        </div>
      ))}
    </div>
  );
}

function InsightsCard({ restaurantId }: { restaurantId: string }) {
  const [state, setState] = useState<MenuInsightsState | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  function load() {
    fetch(`/api/v1/dashboard/${restaurantId}/insights`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setState);
  }

  useEffect(() => { load(); }, [restaurantId]);

  async function handleRefresh() {
    setRefreshing(true);
    setRateLimited(false);
    try {
      const res = await fetch(`/api/v1/dashboard/${restaurantId}/insights/refresh`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setRateLimited(data.rateLimited);
      }
    } finally {
      setRefreshing(false);
    }
  }

  if (state === undefined) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === null) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <p className="font-semibold">Menu insights</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {rateLimited && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Refreshed too recently — try again in a bit.
        </p>
      )}

      {state.insufficientData ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Not enough orders yet in this period to spot reliable patterns. Check back once you&apos;ve had more sales.
        </p>
      ) : state.result ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">{state.result.summary}</p>
          <div className="space-y-2">
            {state.result.insights.map((insight, i) => {
              const isCut = insight.type === "cut";
              const Icon = isCut ? Scissors : Megaphone;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
                    isCut
                      ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
                      : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  }`}
                >
                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isCut ? "text-red-500" : "text-emerald-600"}`} />
                  <div>
                    <p className="text-sm font-semibold">{insight.itemName}</p>
                    <p className="text-xs text-muted-foreground">{insight.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No standout items to flag right now — menu looks balanced.</p>
      )}

      {state.refreshedAt && (
        <p className="mt-3 text-[11px] text-muted-foreground">Updated {timeAgo(state.refreshedAt)}</p>
      )}
    </div>
  );
}

export function AnalyticsDashboard({
  restaurantId,
  showAiInsights = false,
  showFullAnalytics = true,
}: {
  restaurantId: string;
  showAiInsights?: boolean;
  showFullAnalytics?: boolean;
}) {
  const cartPlan = !showFullAnalytics;
  const availableRanges: AnalyticsRange[] = cartPlan ? ["today", "7d"] : RANGES;
  const [range, setRange] = useState<AnalyticsRange>(cartPlan ? "today" : "30d");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/dashboard/${restaurantId}/analytics?range=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [restaurantId, range]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ background: "#3d3929" }}>
          <div>
            <h1
              className="flex items-center gap-2 text-xl font-black tracking-tight"
              style={{ color: "#faf9f5", fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              <BarChart3 className="h-5 w-5" /> Analytics
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: "rgba(250,249,245,0.5)" }}>
              How your café is really doing
            </p>
          </div>
          <div className="flex gap-1.5">
            {availableRanges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  range === r ? "bg-[#c96442] text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                {ANALYTICS_RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data.hasAnyData ? (
        <div className="rounded-2xl border border-dashed border-border px-8 py-16 text-center">
          <p className="text-3xl">📊</p>
          <p className="mt-3 font-medium">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Analytics will appear here once your café starts taking orders.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard icon={Wallet} label="Revenue" value={formatMoney(data.kpis.revenueCents, data.currency)} deltaPct={data.kpis.revenueDeltaPct} />
            <KpiCard icon={Receipt} label="Orders" value={data.kpis.orderCount} deltaPct={data.kpis.orderCountDeltaPct} />
            <KpiCard icon={TrendingUp} label="Avg order value" value={formatMoney(data.kpis.avgOrderValueCents, data.currency)} deltaPct={data.kpis.avgOrderValueDeltaPct} />
            {cartPlan ? (
              <KpiCard
                icon={BarChart3}
                label="Avg items / order"
                value={data.kpis.orderCount > 0 ? (data.topItems.reduce((s, i) => s + i.quantitySold, 0) / data.kpis.orderCount).toFixed(1) : "—"}
                deltaPct={null}
              />
            ) : (
              <KpiCard
                icon={Repeat2}
                label="Repeat customers"
                value={data.kpis.repeatCustomerRatePct !== null ? `${data.kpis.repeatCustomerRatePct.toFixed(0)}%` : "—"}
                deltaPct={null}
              />
            )}
          </div>

          {/* Revenue trend */}
          <SectionCard title="Revenue trend" sub="Daily revenue and order count">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.revenueTrend}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c96442" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#c96442" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => formatMoney(Number(value), data.currency)}
                  labelFormatter={(label) => formatDateShort(label as string)}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenueCents" stroke="#c96442" fill="url(#revenueFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Peak hours — full heatmap for table plan, simple ranked list for cart */}
          {showFullAnalytics ? (
            <SectionCard title="Peak hours" sub="When orders come in, by day and hour">
              <PeakHoursHeatmap cells={data.peakHours} />
            </SectionCard>
          ) : (
            <SectionCard title="Busiest hours" sub="When most orders come in">
              {data.peakHours.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <BusiestHoursList cells={data.peakHours} />
              )}
            </SectionCard>
          )}

          {/* AI insights — gated behind aiInsights feature flag */}
          {showAiInsights && <InsightsCard restaurantId={restaurantId} />}

          {/* Best / worst sellers */}
          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard title="Best sellers" sub="Ranked by revenue">
              {data.topItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {data.topItems.slice(0, 6).map((item) => (
                    <MenuItemRow key={item.menuItemId} {...item} currency={data.currency} tone="top" />
                  ))}
                </div>
              )}
            </SectionCard>
            <SectionCard title="Underperformers" sub="Available items selling the least">
              {data.bottomItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {data.bottomItems.slice(0, 6).map((item) => (
                    <MenuItemRow key={item.menuItemId} {...item} currency={data.currency} tone="bottom" />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* What sells when — full analytics only */}
          {showFullAnalytics && (
            <div className="grid gap-4 sm:grid-cols-2">
              <SectionCard title="Top item by time of day" sub="Most ordered item in each part of the day">
                <ItemTimeTable rows={data.itemsByHour} emptyText="Not enough data yet." />
              </SectionCard>
              <SectionCard title="Top item by day of week" sub="Most ordered item each day">
                <ItemTimeTable rows={data.itemsByDay} emptyText="Not enough data yet." />
              </SectionCard>
            </div>
          )}

          {/* Customer segments — full analytics only */}
          {showFullAnalytics && (<div className="grid gap-4 sm:grid-cols-2">
            <SectionCard title="Customers" sub="New vs returning in this period">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-2xl font-bold">{data.customerSegments.newCount}</p>
                  <p className="text-xs text-muted-foreground">New</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.customerSegments.returningCount}</p>
                  <p className="text-xs text-muted-foreground">Returning</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {data.customerSegments.repeatRatePct !== null ? `${data.customerSegments.repeatRatePct.toFixed(0)}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Repeat rate</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="At-risk regulars" sub="3+ visits, haven't been back in 3+ weeks">
              {data.customerSegments.atRisk.length === 0 ? (
                <p className="text-sm text-muted-foreground">No at-risk regulars right now.</p>
              ) : (
                <div className="space-y-2">
                  {data.customerSegments.atRisk.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name ?? "Anonymous"}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> +91 {c.phone} · {c.visitCount} visits
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" /> {c.daysSinceLastVisit}d
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>)}

          {/* Table turnover — full analytics only */}
          {showFullAnalytics && (
            <SectionCard title="Table turnover" sub="Sessions per table in this period">
              {data.tableTurnover.length === 0 ? (
                <p className="text-sm text-muted-foreground">No table sessions yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, data.tableTurnover.length * 36)}>
                  <BarChart data={data.tableTurnover} layout="vertical" margin={{ left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={70} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const avgMinutes = (item?.payload as { avgSessionMinutes?: number } | undefined)?.avgSessionMinutes;
                        return [`${value} sessions${avgMinutes ? ` · avg ${avgMinutes}m` : ""}`, ""];
                      }}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="sessionCount" fill="#c96442" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
