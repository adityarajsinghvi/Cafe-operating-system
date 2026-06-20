"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useTransition } from "react";

import { updateOrderStatusAction } from "@/lib/actions/orders";
import { springSnappy } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";
import {
  formatOrderTotal,
  getNextOrderStatus,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from "@/types/order";

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
  pending:   { label: "PENDING",   border: "#d97706", color: "#92400e", bg: "#fffbeb" },
  confirmed: { label: "CONFIRMED", border: "#2563eb", color: "#1e40af", bg: "#eff6ff" },
  preparing: { label: "KITCHEN",   border: "#ea580c", color: "#9a3412", bg: "#fff7ed" },
  ready:     { label: "READY",     border: "#16a34a", color: "#14532d", bg: "#f0fdf4" },
  served:    { label: "SERVED",    border: "#6b7280", color: "#374151", bg: "#f9fafb" },
  cancelled: { label: "CANCELLED", border: "#dc2626", color: "#7f1d1d", bg: "#fef2f2" },
};

const NEXT_LABEL: Record<string, string> = {
  pending:   "Confirm order →",
  confirmed: "Start cooking →",
  preparing: "Mark ready →",
  ready:     "Mark served →",
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
  const nextStatus = getNextOrderStatus(order.status);
  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const stamp = STATUS_STAMP[order.status] ?? STATUS_STAMP.pending;

  function advanceStatus(target?: Order["status"]) {
    const status = target ?? nextStatus;
    if (!status) return;
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
        {ORDER_STATUS_FLOW.map((step, index) => (
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

        <div className="flex items-center gap-2">
          {order.status !== "served" && order.status !== "cancelled" && nextStatus !== "served" && nextStatus && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => advanceStatus("served")}
              className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Mark served
            </button>
          )}
          {nextStatus && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => advanceStatus()}
              className="rounded-lg px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#c96442" }}
            >
              {NEXT_LABEL[order.status] ?? `Mark ${ORDER_STATUS_LABELS[nextStatus].toLowerCase()} →`}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
