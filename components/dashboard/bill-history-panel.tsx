"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarRange,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
} from "lucide-react";

import { BillCard } from "@/components/dashboard/bill-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  downloadBillsCsv,
  downloadBillsPdf,
  filterBillsByDateRange,
  sortBills,
  type BillSortField,
  type BillSortOrder,
} from "@/lib/bills/export";
import { cn } from "@/lib/utils";
import type { TableBill } from "@/types/order";
import { formatOrderTotal } from "@/types/order";

export function BillHistoryPanel({
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
  const [sortOrder, setSortOrder] = useState<BillSortOrder>("newest");
  const [sortField, setSortField] = useState<BillSortField>("paid_date");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/v1/dashboard/${restaurantId}/bills?status=paid`,
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
    setBills(initialBills);
  }, [initialBills]);

  const filteredBills = useMemo(
    () =>
      filterBillsByDateRange(
        bills,
        dateFrom || undefined,
        dateTo || undefined,
        sortField,
      ),
    [bills, dateFrom, dateTo, sortField],
  );

  const sortedBills = useMemo(
    () => sortBills(filteredBills, sortOrder, sortField),
    [filteredBills, sortOrder, sortField],
  );

  const totalRevenue = useMemo(
    () => sortedBills.reduce((sum, bill) => sum + bill.totalCents, 0),
    [sortedBills],
  );

  const hasDateFilter = Boolean(dateFrom || dateTo);

  function clearDateFilter() {
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Sort & filter by date</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-xl border border-border/60 bg-muted/40 p-0.5">
                {(
                  [
                    { id: "paid_date" as const, label: "Paid date" },
                    { id: "order_date" as const, label: "Order date" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSortField(option.id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      sortField === option.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex rounded-xl border border-border/60 bg-muted/40 p-0.5">
                {(
                  [
                    {
                      id: "newest" as const,
                      label: "Newest",
                      icon: ArrowDownAZ,
                    },
                    {
                      id: "oldest" as const,
                      label: "Oldest",
                      icon: ArrowUpAZ,
                    },
                  ] as const
                ).map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSortOrder(option.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        sortOrder === option.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="history-date-from" className="text-xs">
                  From
                </Label>
                <Input
                  id="history-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="history-date-to" className="text-xs">
                  To
                </Label>
                <Input
                  id="history-date-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            {hasDateFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearDateFilter}
                className="h-8 px-2 text-xs text-muted-foreground"
              >
                Clear date filter
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isRefreshing}
              className="gap-2 rounded-xl"
            >
              {isRefreshing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={sortedBills.length === 0}
              onClick={() =>
                downloadBillsCsv({
                  bills: sortedBills,
                  restaurantName,
                  currency,
                  filename: "bill-history",
                })
              }
              className="gap-2 rounded-xl"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={sortedBills.length === 0}
              onClick={() =>
                downloadBillsPdf({
                  bills: sortedBills,
                  restaurantName,
                  currency,
                  title: "Bill history",
                })
              }
              className="gap-2 rounded-xl"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <History className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {sortedBills.length} paid bill{sortedBills.length === 1 ? "" : "s"}
            {hasDateFilter && bills.length !== sortedBills.length && (
              <> (filtered from {bills.length})</>
            )}
            {sortedBills.length > 0 && (
              <> · {formatOrderTotal(totalRevenue, currency)} collected</>
            )}
          </p>
        </div>
      </div>

      {sortedBills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-lg font-semibold">
            {hasDateFilter ? "No bills in this date range" : "No paid bills yet"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasDateFilter
              ? "Try widening the date range or clearing the filter."
              : "Bills marked as paid on the Orders page will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedBills.map((bill) => (
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
      )}
    </div>
  );
}
