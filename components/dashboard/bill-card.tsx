"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Loader2,
  Printer,
  Receipt,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateBillPaymentStatusAction } from "@/lib/actions/orders";
import { formatBillDate, printBill } from "@/lib/bills/export";
import { springSnappy } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";
import type { TableBill } from "@/types/order";
import { formatOrderTotal } from "@/types/order";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function BillCard({
  bill,
  restaurantId,
  restaurantName,
  currency,
  onUpdated,
  showPaymentActions = true,
}: {
  bill: TableBill;
  restaurantId: string;
  restaurantName: string;
  currency: string;
  onUpdated?: () => void;
  showPaymentActions?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isPaid = bill.paymentStatus === "paid";

  const latestOrder = bill.orders[bill.orders.length - 1];
  const displayDate = bill.paidAt ?? latestOrder?.createdAt;

  function setPaymentStatus(status: "paid" | "unpaid") {
    startTransition(async () => {
      await updateBillPaymentStatusAction(restaurantId, bill.sessionId, status);
      onUpdated?.();
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSnappy}
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        isPaid ? "border-emerald-500/30" : "border-amber-500/35",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">
              {bill.tableLabel ? `Table ${bill.tableLabel}` : "Walk-in"}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isPaid
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
              )}
            >
              {isPaid ? "Paid" : "Unpaid"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {bill.itemCount} items · {bill.orderCount} order
            {bill.orderCount === 1 ? "" : "s"}
            {displayDate && (
              <>
                {" "}
                · {isPaid ? "Paid" : "Updated"}{" "}
                {isPaid ? formatBillDate(displayDate) : timeAgo(displayDate)}
              </>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tracking-tight">
            {formatOrderTotal(bill.totalCents, currency)}
          </p>
          <Receipt className="ml-auto mt-1 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        View bill details
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
              {bill.orders.map((order, index) => (
                <div key={order.id}>
                  {bill.orders.length > 1 && (
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Round {index + 1}
                    </p>
                  )}
                  <ul className="space-y-1 text-sm">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between gap-2 text-muted-foreground"
                      >
                        <span>
                          {item.quantity}× {item.name}
                        </span>
                        <span>
                          {formatOrderTotal(
                            item.priceCents * item.quantity,
                            currency,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1 rounded-xl"
          onClick={() => printBill(bill, restaurantName, currency)}
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>

        {showPaymentActions &&
          (isPaid ? (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl"
              disabled={isPending}
              onClick={() => setPaymentStatus("unpaid")}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Mark unpaid"
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 gap-1 rounded-xl"
              disabled={isPending}
              onClick={() => setPaymentStatus("paid")}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Mark paid
                </>
              )}
            </Button>
          ))}
      </div>
    </motion.div>
  );
}
