"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Phone,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import type { CustomerSummary } from "@/services/customers.service";

type SortKey = "lastVisit" | "totalSpent" | "loyaltyPoints" | "visits";
type SortDir = "asc" | "desc";

function formatINR(cents: number) {
  const amount = cents / 100;
  return `₹${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(0)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function SortIcon({ col, active, dir }: { col: SortKey; active: SortKey; dir: SortDir }) {
  if (col !== active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return dir === "desc"
    ? <ArrowDown className="h-3 w-3 text-primary" />
    : <ArrowUp className="h-3 w-3 text-primary" />;
}

export default function CustomersPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch(`/api/v1/dashboard/${restaurantId}/customers`)
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .finally(() => setLoading(false));
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
    } else if (sortKey === "totalSpent") {
      av = a.totalSpent; bv = b.totalSpent;
    } else if (sortKey === "loyaltyPoints") {
      av = a.loyaltyPoints; bv = b.loyaltyPoints;
    } else {
      av = a.visitCount; bv = b.visitCount;
    }
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const totalCustomers = customers.length;
  const returning = customers.filter((c) => c.visitCount > 1).length;
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const avgVisits = totalCustomers > 0
    ? (customers.reduce((s, c) => s + c.visitCount, 0) / totalCustomers).toFixed(1)
    : "0";

  const stats = [
    { label: "Total", value: totalCustomers, icon: Users },
    { label: "Returning", value: returning, icon: TrendingUp },
    { label: "Avg visits", value: avgVisits, icon: Calendar },
    { label: "Revenue", value: formatINR(totalRevenue), icon: Wallet },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4" style={{ background: "#3d3929" }}>
          <h1
            className="text-xl font-black tracking-tight"
            style={{ color: "#faf9f5", fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Customers 👥
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(250,249,245,0.5)" }}>
            Guests who shared their number while ordering
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <stat.icon className="mx-auto mb-1.5 h-4 w-4 text-muted-foreground" />
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-medium">No customers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers appear here once they share their phone number while ordering.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Favourites</th>
                  <th
                    className="cursor-pointer px-4 py-3 text-center font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("visits")}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Visits <SortIcon col="visits" active={sortKey} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-center font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("loyaltyPoints")}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Points <SortIcon col="loyaltyPoints" active={sortKey} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("totalSpent")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Spent <SortIcon col="totalSpent" active={sortKey} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("lastVisit")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Last visit <SortIcon col="lastVisit" active={sortKey} dir={sortDir} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      {customer.name || (
                        <span className="italic text-muted-foreground">Anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:+91${customer.phone}`}
                        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" />
                        +91 {customer.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {customer.tasteProfile?.top_items?.slice(0, 3).map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
                          >
                            {item}
                          </span>
                        )) ?? <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <ShoppingBag className="h-3 w-3" />
                        {customer.visitCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Star className="h-3 w-3" />
                        {customer.loyaltyPoints}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {customer.totalSpent > 0 ? formatINR(customer.totalSpent) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {formatDate(customer.lastVisitAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
