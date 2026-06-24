"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useTransition } from "react";

import { updateOrderStatusAction } from "@/lib/actions/orders";
import { springSnappy } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";
import { formatOrderTotal, TABLE_ORDER_STATUS_FLOW } from "@/types/order";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const STATUS_STAMP: Record<
  Order["status"],
  { label: string; border: string; color: string; bg: string }
> = {
  pending_payment: { label: "AWAITING\nPAYMENT", border: "#7c3aed", color: "#4c1d95", bg: "#f5f3ff" },
  pending:         { label: "PENDING",   border: "#d97706", color: "#92400e", bg: "#fffbeb" },
  confirmed:       { label: "CONFIRMED", border: "#2563eb", color: "#1e40af", bg: "#eff6ff" },
  served:          { label: "SERVED",    border: "#6b7280", color: "#374151", bg: "#f9fafb" },
  cancelled:       { label: "CANCELLED", border: "#dc2626", color: "#7f1d1d", bg: "#fef2f2" },
};

export function OrderCard({
  order,
  restaurantId,
  currency,
  onUpdated,
}: {
  order: Order;
  restaurantId: string;
  currency: string;
  onUpdated?: () => void;
}) {
  const [isUpdating, startUpdate] = useTransition();
  const isPendingPayment = order.status === "pending_payment";
  // For progress dots, treat pending_payment as pre-pending (index -1 in TABLE flow)
  const currentIndex = isPendingPayment ? -1 : TABLE_ORDER_STATUS_FLOW.indexOf(order.status);
  const stamp = STATUS_STAMP[order.status] ?? STATUS_STAMP.pending;
  const isServed = order.status === "served";
  const isCancelled = order.status === "cancelled";

  function setStatus(status: Order["status"]) {
    startUpdate(async () => {
      await updateOrderStatusAction(restaurantId, order.id, status);
      onUpdated?.();
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSnappy}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-sm",
        order.status === "pending"
          ? "border-amber-300/80 shadow-amber-100/60 ring-1 ring-amber-200/60"
          : order.status === "pending_payment"
          ? "border-violet-300/80 shadow-violet-100/60 ring-1 ring-violet-200/60"
          : "border-border",
      )}
    >
      {/* Ruled paper texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.04) 23px,rgba(0,0,0,0.04) 24px)",
          backgroundPosition: "0 8px",
        }}
        aria-hidden
      />

      {/* Chit header — dark espresso band */}
      <div
        className="relative flex items-center justify-between gap-3 px-4 py-3"
        style={{ background: "#3d3929" }}
      >
        <div className="flex items-center gap-2.5">
          <p
            className="font-bold tracking-tight text-[#faf9f5]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {order.tableLabel ? `Table ${order.tableLabel}` : "Walk-in"}
            {order.tokenNumber !== null && (
              <span className="ml-2 text-xs font-normal" style={{ color: "rgba(250,249,245,0.65)" }}>
                #{order.tokenNumber}
              </span>
            )}
          </p>
          <span className="flex items-center gap-1 text-xs" style={{ color: "rgba(250,249,245,0.55)" }}>
            <Clock className="h-3 w-3" />
            {timeAgo(order.createdAt)}
          </span>
        </div>

        {/* Ink stamp */}
        <div
          className="chit-stamp h-10 w-10 text-[7px] shrink-0"
          style={{ borderColor: stamp.border, color: stamp.color, background: stamp.bg }}
        >
          {stamp.label}
        </div>
      </div>

      {/* Progress dots */}
      <div className="relative flex items-center gap-1 px-4 pt-3 pb-0">
        {TABLE_ORDER_STATUS_FLOW.map((step, index) => (
          <div
            key={step}
            className={cn(
              "h-1 flex-1 rounded-full transition-all",
              index <= currentIndex ? "bg-[#c96442]" : "bg-muted",
            )}
          />
        ))}
      </div>

      {/* Items — on ruled paper */}
      <div className="relative px-4 pt-3 pb-1">
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="text-foreground" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground mr-1.5">
                  {item.quantity}
                </span>
                {item.name}
                {item.notes && (
                  <span className="block ml-5 text-[11px] italic text-muted-foreground/70 leading-tight">
                    {item.notes}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatOrderTotal(item.priceCents * item.quantity, currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {order.notes && (
        <div className="relative mx-4 mt-2 rounded border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
          <span className="mr-1 font-bold text-muted-foreground/60">Note:</span>
          {order.notes}
        </div>
      )}

      {/* Dashed divider */}
      <div className="relative mx-4 mt-3 border-t border-dashed border-border/60" />

      {/* Footer */}
      <div className="relative flex items-center justify-between gap-3 px-4 py-3">
        <span
          className="font-bold text-[#c96442]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {formatOrderTotal(order.subtotalCents, currency)}
        </span>

        {!isServed && !isCancelled && (
          <div className="flex items-center gap-2">
            {isPendingPayment ? (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setStatus("confirmed")}
                className="rounded-lg px-3.5 py-2 text-[11px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "#7c3aed" }}
              >
                Confirm payment
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isUpdating || order.status === "confirmed"}
                  onClick={() => setStatus("confirmed")}
                  className="rounded-lg border border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {order.status === "confirmed" ? "Confirmed ✓" : "Confirm order"}
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => setStatus("served")}
                  className="rounded-lg px-3.5 py-2 text-[11px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#c96442" }}
                >
                  Order served
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
