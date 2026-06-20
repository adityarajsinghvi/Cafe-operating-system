"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  ChefHat,
  PartyPopper,
  Send,
  Sparkles,
} from "lucide-react";

import { springGentle, springSnappy } from "@/lib/motion/presets";
import { resolveGuestBrandColor } from "@/lib/guest/brand-color";
import type { OrderStatus } from "@/types/order";
import { GUEST_ORDER_STATUS, ORDER_STATUS_FLOW } from "@/types/order";
import { cn } from "@/lib/utils";

const STEP_ICONS = [Send, Check, ChefHat, Bell, PartyPopper];

export function GuestOrderProgress({
  status,
  primaryColor,
  compact = false,
}: {
  status: OrderStatus;
  primaryColor?: string;
  compact?: boolean;
}) {
  const brandColor = resolveGuestBrandColor(primaryColor);
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);
  const isCancelled = status === "cancelled";
  const progress =
    currentIndex >= 0
      ? (currentIndex / (ORDER_STATUS_FLOW.length - 1)) * 100
      : 0;

  if (isCancelled) {
    return (
      <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
        Order cancelled
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${brandColor}, color-mix(in oklch, ${brandColor} 70%, white))`,
          }}
          initial={false}
          animate={{ width: `${Math.max(progress, 8)}%` }}
          transition={springGentle}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative px-1">
        <div className="absolute left-4 right-4 top-5 h-0.5 bg-muted" />
        <motion.div
          className="absolute left-4 top-5 h-0.5 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${brandColor}, color-mix(in oklch, ${brandColor} 60%, white))`,
            maxWidth: "calc(100% - 2rem)",
          }}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ ...springGentle, duration: 0.6 }}
        />

        <div className="relative flex justify-between">
          {ORDER_STATUS_FLOW.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Sparkles;
            const isComplete = currentIndex > index;
            const isCurrent = currentIndex === index;
            const meta = GUEST_ORDER_STATUS[step];

            return (
              <div
                key={step}
                className="flex flex-col items-center gap-2"
                style={{ width: `${100 / ORDER_STATUS_FLOW.length}%` }}
              >
                <motion.div
                  animate={
                    isCurrent
                      ? {
                          scale: [1, 1.12, 1],
                          boxShadow: [
                            "0 0 0 0 transparent",
                            brandColor
                              ? `0 0 0 8px color-mix(in oklch, ${brandColor} 25%, transparent)`
                              : "0 0 0 8px color-mix(in oklch, var(--guest-accent) 25%, transparent)",
                            "0 0 0 0 transparent",
                          ],
                        }
                      : { scale: 1 }
                  }
                  transition={
                    isCurrent
                      ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      : springSnappy
                  }
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isComplete || isCurrent
                      ? "border-transparent text-[var(--guest-accent-foreground)]"
                      : "border-border/60 bg-card text-muted-foreground",
                  )}
                  style={
                    isComplete || isCurrent
                      ? { backgroundColor: brandColor }
                      : undefined
                  }
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </motion.div>
                <span
                  className={cn(
                    "text-center text-[10px] font-medium leading-tight",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GuestOrderStatusHero({
  status,
  primaryColor,
}: {
  status: OrderStatus;
  primaryColor?: string;
}) {
  const brandColor = resolveGuestBrandColor(primaryColor);
  const meta = GUEST_ORDER_STATUS[status];
  const isReady = status === "ready";
  const isServed = status === "served";

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden rounded-2xl p-4",
        isReady && "ring-1 ring-amber-400/40",
        isServed && "ring-1 ring-green-400/30",
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in oklch, ${brandColor} 12%, var(--card)) 0%, var(--card) 100%)`,
      }}
    >
      {isReady && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-400/10 via-transparent to-amber-400/10"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative flex items-center gap-4">
        <motion.span
          key={status}
          initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={springSnappy}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-2xl"
        >
          {meta.emoji}
        </motion.span>
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.h3
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={springGentle}
              className="text-xl font-semibold tracking-tight"
            >
              {meta.label}
            </motion.h3>
          </AnimatePresence>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
