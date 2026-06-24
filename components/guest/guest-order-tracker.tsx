"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, Check, Clock, Copy, Receipt, UtensilsCrossed, X } from "lucide-react";

import { useGuestCart } from "@/components/guest/guest-cart-provider";
import {
  GuestOrderProgress,
  GuestOrderStatusHero,
} from "@/components/guest/guest-order-progress";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { springGentle } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";
import { formatMenuPrice } from "@/types/guest";
import type { BillPaymentStatus, Order } from "@/types/order";
import {
  formatOrderTotal,
  GUEST_ORDER_STATUS,
  GUEST_TRACKABLE_STATUSES,
} from "@/types/order";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function UpiPaymentPanel({
  order,
  upiId,
  currency,
}: {
  order: Order;
  upiId: string;
  currency: string;
}) {
  const [copied, setCopied] = useState(false);

  function copyUpiId() {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">💳</span>
        <div>
          <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">Pay to confirm</p>
          <p className="text-xs text-violet-700 dark:text-violet-300">
            Send {formatOrderTotal(order.subtotalCents, currency)} via UPI
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700 px-3 py-2.5">
        <span className="text-sm font-mono text-violet-900 dark:text-violet-100 truncate">{upiId}</span>
        <button
          type="button"
          onClick={copyUpiId}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {order.tokenNumber !== null && (
        <p className="text-center text-xs text-violet-600 dark:text-violet-400">
          Use token <span className="font-bold">#{order.tokenNumber}</span> as payment reference
        </p>
      )}

      <p className="text-center text-[11px] text-violet-500 dark:text-violet-400">
        The vendor will confirm your order once payment is received
      </p>
    </div>
  );
}

function OrderDetail({
  order,
  currency,
  primaryColor,
  upiId,
}: {
  order: Order;
  currency: string;
  primaryColor?: string;
  upiId?: string | null;
}) {
  const meta = GUEST_ORDER_STATUS[order.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <GuestOrderStatusHero status={order.status} primaryColor={primaryColor} />
      <GuestOrderProgress status={order.status} primaryColor={primaryColor} />

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Items</p>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeAgo(order.createdAt)}
          </span>
        </div>
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {item.quantity}×
                </span>{" "}
                {item.name}
              </span>
              <span className="shrink-0 font-medium">
                {formatMenuPrice(item.priceCents * item.quantity, currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-bold">
            {formatOrderTotal(order.subtotalCents, currency)}
          </span>
        </div>
      </div>

      {order.status === "pending_payment" && upiId && (
        <UpiPaymentPanel order={order} upiId={upiId} currency={currency} />
      )}

      {order.status === "confirmed" && (
        <div className="rounded-2xl bg-amber-500/15 px-4 py-3 text-center text-sm font-medium text-amber-800 dark:text-amber-200">
          {meta.emoji} The kitchen is on it!
        </div>
      )}
    </motion.div>
  );
}

function SessionBill({
  orders,
  currency,
  tableLabel,
  billPaymentStatus,
  onRequestBill,
}: {
  orders: Order[];
  currency: string;
  tableLabel: string | null;
  billPaymentStatus: BillPaymentStatus | null;
  onRequestBill: () => void;
}) {
  const total = orders.reduce((sum, order) => sum + order.subtotalCents, 0);
  const itemCount = orders.reduce((sum, order) => sum + order.itemCount, 0);
  const isPaid = billPaymentStatus === "paid";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {isPaid && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">
          <Check className="h-4 w-4 shrink-0" />
          Payment received — thank you!
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">Table bill</p>
            {tableLabel && (
              <p className="text-sm text-muted-foreground">Table {tableLabel}</p>
            )}
          </div>
          <Receipt className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="mt-5 space-y-4">
          {orders.map((order, index) => (
            <div key={order.id}>
              {orders.length > 1 && (
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Round {index + 1} · {timeAgo(order.createdAt)}
                </p>
              )}
              <ul className="space-y-1.5">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {item.quantity}× {item.name}
                    </span>
                    <span>
                      {formatMenuPrice(item.priceCents * item.quantity, currency)}
                    </span>
                  </li>
                ))}
              </ul>
              {orders.length > 1 && (
                <p className="mt-2 text-right text-xs text-muted-foreground">
                  {formatOrderTotal(order.subtotalCents, currency)}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-dashed border-border pt-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {itemCount} items · {orders.length} order
              {orders.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {formatOrderTotal(total, currency)}
            </p>
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl gap-2"
        onClick={onRequestBill}
        disabled={isPaid}
      >
        <Receipt className="h-4 w-4" />
        {isPaid ? "Bill settled" : "Ask for printed bill"}
      </Button>
    </motion.div>
  );
}

export function GuestOrderTracker({
  currency,
  primaryColor,
}: {
  currency: string;
  primaryColor?: string;
}) {
  const {
    activeOrders,
    focusOrder,
    focusOrderId,
    setFocusOrderId,
    trackerOpen,
    setTrackerOpen,
    tableLabel,
    servedOrders,
    sessionBillCents,
    hasSessionBill,
    billPaymentStatus,
    requestService,
    itemCount,
    cartOpen,
    sessionReady,
    upiId,
  } = useGuestCart();

  const trackableOrders = activeOrders.filter((order) =>
    GUEST_TRACKABLE_STATUSES.includes(order.status),
  );

  const [panel, setPanel] = useState<"orders" | "bill">("orders");

  const displayOrder =
    focusOrder ??
    trackableOrders.find((o) => o.id === focusOrderId) ??
    trackableOrders[0] ??
    null;

  useEffect(() => {
    if (!trackerOpen) return;
    if (trackableOrders.length > 0) {
      setPanel("orders");
      if (!focusOrderId || !trackableOrders.some((o) => o.id === focusOrderId)) {
        setFocusOrderId(trackableOrders[0].id);
      }
    } else if (hasSessionBill) {
      setPanel("bill");
    }
  }, [trackerOpen, trackableOrders, focusOrderId, hasSessionBill, setFocusOrderId]);

  const showFloatingPill =
    !trackerOpen && (trackableOrders.length > 0 || hasSessionBill);

  const hasPendingBar = itemCount > 0 && !cartOpen;
  const hasServiceBar = sessionReady && Boolean(tableLabel);
  const pillBottom = hasPendingBar
    ? hasServiceBar
      ? "bottom-[calc(14.5rem+env(safe-area-inset-bottom))]"
      : "bottom-[calc(9.25rem+env(safe-area-inset-bottom))]"
    : hasServiceBar
      ? "bottom-[calc(10.75rem+env(safe-area-inset-bottom))]"
      : "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]";

  const pillOrder = displayOrder ?? servedOrders[0];
  if (!pillOrder && !hasSessionBill) return null;

  const pillMeta = pillOrder
    ? GUEST_ORDER_STATUS[pillOrder.status]
    : { label: "Bill ready", emoji: "🧾" };

  return (
    <>
      <AnimatePresence>
        {showFloatingPill && pillOrder && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={springGentle}
            onClick={() => setTrackerOpen(true)}
            className={cn(
              "fixed inset-x-4 z-40 mx-auto max-w-lg",
              pillBottom,
            )}
          >
            <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card p-2.5 shadow-lg">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-lg">
                {pillMeta.emoji}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold">{pillMeta.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {trackableOrders.length > 1
                    ? `${trackableOrders.length} active orders`
                    : `${pillOrder.itemCount} items · ${formatOrderTotal(pillOrder.subtotalCents, currency)}`}
                </p>
                {trackableOrders.length === 1 && (
                  <div className="mt-1.5">
                    <GuestOrderProgress
                      status={pillOrder.status}
                      primaryColor={primaryColor}
                      compact
                    />
                  </div>
                )}
              </div>
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </motion.button>
        )}

        {showFloatingPill && !pillOrder && hasSessionBill && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={() => {
              setPanel("bill");
              setTrackerOpen(true);
            }}
            className={cn(
              "fixed inset-x-4 z-40 mx-auto max-w-lg",
              pillBottom,
            )}
          >
            <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card p-2.5 shadow-lg">
              <span className="text-lg">🧾</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">View table bill</p>
                <p className="text-xs text-muted-foreground">
                  {formatOrderTotal(sessionBillCents, currency)}
                </p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={trackerOpen} onOpenChange={setTrackerOpen}>
        <SheetContent
          side="bottom"
          hideClose
          className="max-h-[88dvh] overflow-hidden border-border/40 p-0"
        >
          <div className="flex max-h-[calc(88dvh-1rem)] flex-col">
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-1">
              <SheetTitle className="flex min-w-0 items-center gap-2 text-lg font-semibold">
                <UtensilsCrossed className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {panel === "bill" ? "Table bill" : "Live orders"}
                </span>
              </SheetTitle>
              <button
                type="button"
                onClick={() => setTrackerOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(trackableOrders.length > 0 || hasSessionBill) && (
              <div className="flex gap-2 px-5 pb-3">
                {trackableOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPanel("orders")}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                      panel === "orders"
                        ? "bg-[var(--guest-accent)] text-[var(--guest-accent-foreground)]"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    Active
                    {trackableOrders.length > 1 && ` (${trackableOrders.length})`}
                  </button>
                )}
                {hasSessionBill && (
                  <button
                    type="button"
                    onClick={() => setPanel("bill")}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                      panel === "bill"
                        ? "bg-[var(--guest-accent)] text-[var(--guest-accent-foreground)]"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    Bill · {formatOrderTotal(sessionBillCents, currency)}
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {panel === "bill" && hasSessionBill ? (
                <SessionBill
                  orders={servedOrders}
                  currency={currency}
                  tableLabel={tableLabel}
                  billPaymentStatus={billPaymentStatus}
                  onRequestBill={() => requestService("bill")}
                />
              ) : displayOrder ? (
                <>
                  {trackableOrders.length > 1 && (
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                      {trackableOrders.map((order, index) => {
                        const meta = GUEST_ORDER_STATUS[order.status];
                        const isSelected = order.id === focusOrderId;

                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => setFocusOrderId(order.id)}
                            className={cn(
                              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                              isSelected
                                ? "bg-[var(--guest-accent)] text-[var(--guest-accent-foreground)]"
                                : "bg-muted text-muted-foreground hover:text-[var(--guest-ink)]",
                            )}
                          >
                            #{index + 1} · {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    <OrderDetail
                      key={displayOrder.id + displayOrder.status}
                      order={displayOrder}
                      currency={currency}
                      primaryColor={primaryColor}
                      upiId={upiId}
                    />
                  </AnimatePresence>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No active orders right now.
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
