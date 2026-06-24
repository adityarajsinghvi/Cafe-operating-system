"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  MessageCircle,
  Phone,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

import type { CustomerSummary } from "@/services/customers.service";

type SortKey = "lastVisit" | "loyaltyPoints" | "visits";
type SortDir = "asc" | "desc";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function CustomersPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [threshold, setThreshold] = useState<number | null>(null);
  const [pointsPerVisit, setPointsPerVisit] = useState<number>(1);
  const [rewardTitle, setRewardTitle] = useState<string>("Free item");
  const [plan, setPlan] = useState<string>("menu");

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/dashboard/${restaurantId}/customers`).then((r) => r.json()),
      fetch(`/api/v1/dashboard/${restaurantId}/rewards`).then((r) => r.json()),
    ]).then(([cData, rData]) => {
      setCustomers(cData.customers ?? []);
      if (rData.config) {
        setThreshold(rData.config.redemptionThreshold);
        setPointsPerVisit(rData.config.pointsPerVisit ?? 1);
        setRewardTitle(rData.config.rewardTitle ?? "Free item");
      }
      if (rData.plan) setPlan(rData.plan);
    }).finally(() => setLoading(false));
  }, [restaurantId]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...customers].sort((a, b) => {
    let av = 0, bv = 0;
    if (sortKey === "lastVisit") {
      av = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0;
      bv = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0;
    } else if (sortKey === "loyaltyPoints") {
      av = a.loyaltyPoints; bv = b.loyaltyPoints;
    } else {
      av = a.visitCount; bv = b.visitCount;
    }
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const totalCustomers = customers.length;
  const returning = customers.filter((c) => c.visitCount > 1).length;
  const avgVisits = totalCustomers > 0
    ? (customers.reduce((s, c) => s + c.visitCount, 0) / totalCustomers).toFixed(1)
    : "0";

  const stats = [
    { label: "Total", value: totalCustomers, icon: Users },
    { label: "Returning", value: returning, icon: TrendingUp },
    { label: "Avg visits", value: avgVisits, icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "lastVisit", label: "Last visit" },
    { key: "visits", label: "Most visits" },
    { key: "loyaltyPoints", label: "Most stamps" },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4" style={{ background: "#3d3929" }}>
          <h1
            className="text-xl font-black tracking-tight"
            style={{ color: "#faf9f5", fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Customers
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(250,249,245,0.5)" }}>
            {totalCustomers} guest{totalCustomers !== 1 ? "s" : ""} collected
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <stat.icon className="mx-auto mb-1.5 h-4 w-4 text-muted-foreground" />
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Almost there — customers 1 stamp away */}
      {threshold !== null && (() => {
        const ppv = pointsPerVisit || 1;
        const almostThere = customers.filter(
          (c) => c.loyaltyPoints >= threshold - ppv && c.loyaltyPoints < threshold,
        );
        if (almostThere.length === 0) return null;
        const stampsTotal = Math.round(threshold / ppv);
        return (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="mb-3 text-sm font-bold text-amber-800 dark:text-amber-400">
              Almost there — {almostThere.length} customer{almostThere.length !== 1 ? "s" : ""} need{almostThere.length === 1 ? "s" : ""} 1 more stamp to earn {rewardTitle}
            </p>
            <div className="space-y-2">
              {almostThere.map((c) => {
                const msg = encodeURIComponent(
                  `Hi ${c.name ?? "there"}! You're just 1 stamp away from earning ${rewardTitle} at our café. Visit us again soon! 😊`,
                );
                const stampsEarned = Math.floor(c.loyaltyPoints / ppv);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/20"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900 truncate dark:text-amber-300">
                        {c.name ?? "Anonymous"} · +91 {c.phone}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-500">
                        {stampsEarned} / {stampsTotal} stamps
                      </p>
                    </div>
                    <a
                      href={`https://wa.me/91${c.phone}?text=${msg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-medium">No customers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers appear here once they share their phone number.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Sort controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Sort:</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleSort(opt.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sortKey === opt.key
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
                {sortKey === opt.key && (sortDir === "desc" ? " ↓" : " ↑")}
              </button>
            ))}
          </div>

          {/* Customer cards */}
          <div className="space-y-2">
            {sorted.map((customer) => {
              const ppv = pointsPerVisit || 1;
              const stampsEarned = Math.floor(customer.loyaltyPoints / ppv);
              const stampsTotal = threshold ? Math.round(threshold / ppv) : null;
              return (
                <div
                  key={customer.id}
                  className="rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {customer.name || <span className="font-normal italic text-muted-foreground">Anonymous</span>}
                      </p>
                      <a
                        href={`tel:+91${customer.phone}`}
                        className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        +91 {customer.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {customer.visitCount} visit{customer.visitCount !== 1 ? "s" : ""}
                      </span>
                      {customer.loyaltyPoints > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <Star className="h-3 w-3" />
                          {stampsTotal ? `${stampsEarned}/${stampsTotal}` : stampsEarned}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Last visit: {formatDate(customer.lastVisitAt)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
