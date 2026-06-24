"use client";

import { useCallback, useEffect, useState } from "react";
import { Hash } from "lucide-react";

import { useRestaurantRealtime } from "@/hooks/use-restaurant-realtime";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/order";

const TOKEN_STATUS_STYLE: Partial<Record<OrderStatus, { bg: string; text: string; label: string }>> = {
  pending_payment: { bg: "bg-violet-100", text: "text-violet-700", label: "Paying" },
  pending:         { bg: "bg-amber-100",  text: "text-amber-700",  label: "Waiting" },
  confirmed:       { bg: "bg-sky-100",    text: "text-sky-700",    label: "Prep" },
  served:          { bg: "bg-emerald-100", text: "text-emerald-700", label: "Ready ✓" },
};

async function fetchTodayTokenOrders(restaurantId: string): Promise<Order[]> {
  const res = await fetch(
    `/api/v1/dashboard/${restaurantId}/orders?status=pending_payment,pending,confirmed,served&tokens_only=1`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  const data = await res.json();
  // Filter to orders with a token number and created today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return ((data.orders ?? data) as Order[]).filter(
    (o) => o.tokenNumber !== null && new Date(o.createdAt) >= todayStart,
  );
}

export function TokenQueueStrip({
  restaurantId,
  initialOrders,
}: {
  restaurantId: string;
  initialOrders: Order[];
}) {
  const [tokenOrders, setTokenOrders] = useState<Order[]>(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return initialOrders
      .filter((o) => o.tokenNumber !== null && new Date(o.createdAt) >= todayStart)
      .sort((a, b) => (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0));
  });

  const refresh = useCallback(async () => {
    const orders = await fetchTodayTokenOrders(restaurantId);
    setTokenOrders(orders.sort((a, b) => (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0)));
  }, [restaurantId]);

  useRestaurantRealtime(restaurantId, refresh, {
    scope: "token-strip",
    tables: ["orders"],
  });

  // Also poll every 20s as fallback
  useEffect(() => {
    const timer = setInterval(refresh, 20_000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (tokenOrders.length === 0) return null;

  const readyCount = tokenOrders.filter((o) => o.status === "served").length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-dashed border-border px-4 py-2.5">
        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Token queue — today
        </span>
        {readyCount > 0 && (
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            {readyCount} ready
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
        {tokenOrders.map((order) => {
          const style = TOKEN_STATUS_STYLE[order.status] ?? TOKEN_STATUS_STYLE.pending!;
          return (
            <div
              key={order.id}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-xl px-3 py-2 min-w-[4.5rem]",
                style.bg,
              )}
            >
              <span className={cn("text-lg font-black tabular-nums leading-none", style.text)}>
                {order.tokenNumber}
              </span>
              <span className={cn("mt-1 text-[10px] font-medium leading-none", style.text)}>
                {style.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
