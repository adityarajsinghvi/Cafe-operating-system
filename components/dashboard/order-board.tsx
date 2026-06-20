"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Radio } from "lucide-react";

import { OrderCard } from "@/components/dashboard/order-card";
import { Button } from "@/components/ui/button";
import { useRestaurantRealtime } from "@/hooks/use-restaurant-realtime";
import { playNewOrderSound } from "@/lib/dashboard/order-notifications";
import type { Order, OrderStatus } from "@/types/order";

const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
];

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "New" },
  { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
];

export function OrderBoard({
  restaurantId,
  currency,
  initialOrders,
}: {
  restaurantId: string;
  currency: string;
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const knownOrderIdsRef = useRef(new Set(initialOrders.map((order) => order.id)));

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/v1/dashboard/${restaurantId}/orders?status=${ACTIVE_STATUSES.join(",")}`,
      );
      if (response.ok) {
        const data = await response.json();
        const nextOrders = (data.orders ?? []) as Order[];

        for (const order of nextOrders) {
          if (
            order.status === "pending" &&
            !knownOrderIdsRef.current.has(order.id)
          ) {
            playNewOrderSound();
            break;
          }
        }

        knownOrderIdsRef.current = new Set(nextOrders.map((order) => order.id));
        setOrders(nextOrders);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [restaurantId]);

  const { connected: realtimeConnected } = useRestaurantRealtime(restaurantId, refresh, {
    scope: "orders",
    tables: ["orders"],
  });

  useEffect(() => {
    setLiveConnected(realtimeConnected);
  }, [realtimeConnected]);

  useEffect(() => {
    if (realtimeConnected) return;
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh, realtimeConnected]);

  const activeOrders = orders.filter((order) =>
    ACTIVE_STATUSES.includes(order.status),
  );

  const newOrderCount = activeOrders.filter(
    (order) => order.status === "pending",
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {activeOrders.length} active order
            {activeOrders.length === 1 ? "" : "s"}
          </p>
          {newOrderCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              {newOrderCount} new
            </span>
          )}
          {liveConnected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              <Radio className="h-3 w-3" />
              Live
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          {isRefreshing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Refresh
        </Button>
      </div>

      {activeOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-lg font-semibold">No active orders</p>
          <p className="mt-2 text-sm text-muted-foreground">
            New guest orders will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const columnOrders = activeOrders.filter(
              (order) => order.status === column.status,
            );

            return (
              <div key={column.status} className="space-y-3">
                <div className="flex items-center justify-between border-b border-dashed border-border pb-2">
                  <h3
                    className="text-sm font-bold tracking-tight"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {column.label}
                  </h3>
                  <span
                    className={
                      column.status === "pending" && columnOrders.length > 0
                        ? "rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900"
                        : "rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {columnOrders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columnOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      restaurantId={restaurantId}
                      currency={currency}
                      onUpdated={refresh}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
