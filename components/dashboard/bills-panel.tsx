"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Loader2 } from "lucide-react";

import { BillCard } from "@/components/dashboard/bill-card";
import { Button } from "@/components/ui/button";
import { useRestaurantRealtime } from "@/hooks/use-restaurant-realtime";
import type { TableBill } from "@/types/order";

export function BillsPanel({
  restaurantId,
  restaurantName,
  currency,
  initialBills,
}: {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  initialBills: TableBill[];
}) {
  const [bills, setBills] = useState(initialBills);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unpaidBills = useMemo(
    () => bills.filter((bill) => bill.paymentStatus === "unpaid"),
    [bills],
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/v1/dashboard/${restaurantId}/bills?status=unpaid`,
      );
      if (response.ok) {
        const data = await response.json();
        setBills(data.bills ?? []);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    setBills(initialBills.filter((bill) => bill.paymentStatus === "unpaid"));
  }, [initialBills]);

  const { connected: realtimeConnected } = useRestaurantRealtime(restaurantId, refresh, {
    scope: "bills",
    tables: ["orders", "table_sessions"],
  });

  useEffect(() => {
    if (realtimeConnected) return;
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh, realtimeConnected]);

  if (unpaidBills.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold sm:text-base">Open bills</h2>
            <p className="text-xs text-muted-foreground">
              {unpaidBills.length} unpaid bill
              {unpaidBills.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
          className="gap-2 text-muted-foreground"
        >
          {isRefreshing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
        {unpaidBills.map((bill) => (
          <BillCard
            key={bill.sessionId}
            bill={bill}
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            currency={currency}
            onUpdated={refresh}
          />
        ))}
      </div>
    </section>
  );
}
