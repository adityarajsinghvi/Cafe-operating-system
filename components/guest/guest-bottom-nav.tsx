"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BellRing,
  ClipboardList,
  Droplets,
  Home,
  Receipt,
  Search,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useGuestCart } from "@/components/guest/guest-cart-provider";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion/presets";
import { SERVICE_REQUEST_LABELS } from "@/types/order";
import type { ServiceRequestType } from "@/types/order";

const SERVICE_ACTIONS: {
  type: ServiceRequestType;
  label: string;
  icon: typeof Droplets;
}[] = [
  { type: "water", label: "Water", icon: Droplets },
  { type: "bill", label: "Bill", icon: Receipt },
  { type: "waiter", label: "Waiter", icon: BellRing },
];

export function GuestBottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const {
    activeOrderCount,
    hasSessionBill,
    setTrackerOpen,
    tableLabel,
    sessionReady,
    requestService,
  } = useGuestCart();
  const basePath = `/r/${slug}`;
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<ServiceRequestType | null>(null);

  const showOrders = activeOrderCount > 0 || hasSessionBill;
  const ordersBadge = activeOrderCount || (hasSessionBill ? 1 : 0);
  const showServiceBar = sessionReady && Boolean(tableLabel);

  const items = [
    { id: "menu", label: "Menu", href: basePath, icon: Home },
    { id: "search", label: "Search", icon: Search, action: "search" as const },
    {
      id: "orders",
      label: "Orders",
      icon: ClipboardList,
      action: "orders" as const,
      badge: ordersBadge,
      hidden: !showOrders,
    },
  ].filter((item) => !("hidden" in item && item.hidden));

  async function handleService(type: ServiceRequestType) {
    setPendingType(type);
    setFeedback(null);

    const result = await requestService(type);
    setPendingType(null);

    if (result.error) {
      setFeedback(result.error);
    } else {
      setFeedback(`${SERVICE_REQUEST_LABELS[type]} sent`);
    }

    window.setTimeout(() => setFeedback(null), 2500);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto max-w-lg space-y-2">
        {showServiceBar && (
          <div className="rounded-[1.35rem] border border-border/60 bg-[var(--guest-elevated,theme(colors.card/0.94))] p-1.5 shadow-lg backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-1">
              {SERVICE_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isPending = pendingType === action.type;

                return (
                  <motion.button
                    key={action.type}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    transition={springSnappy}
                    disabled={Boolean(pendingType)}
                    onClick={() => handleService(action.type)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-colors",
                      isPending
                        ? "bg-[var(--guest-accent)] text-[var(--guest-accent-foreground)]"
                        : "text-muted-foreground hover:bg-[var(--guest-accent-soft)] hover:text-[var(--guest-accent)]",
                    )}
                  >
                    <Icon className="h-[1.125rem] w-[1.125rem]" />
                    {action.label}
                  </motion.button>
                );
              })}
            </div>
            {feedback && (
              <p className="px-2 pb-1 pt-1.5 text-center text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                {feedback}
              </p>
            )}
          </div>
        )}

        <div className="rounded-[1.6rem] border border-border/60 bg-[var(--guest-elevated,theme(colors.card/0.94))] p-1.5 shadow-2xl shadow-[color-mix(in_oklch,var(--guest-ink)_8%,transparent)] backdrop-blur-2xl">
          <div className="relative flex items-center justify-around">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href ? pathname === item.href : false;

              if (item.action === "search") {
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    transition={springSnappy}
                    onClick={() => {
                      document
                        .getElementById("guest-menu-search")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      (
                        document.getElementById(
                          "guest-menu-search-input",
                        ) as HTMLInputElement | null
                      )?.focus();
                    }}
                    className="relative flex flex-col items-center gap-1 px-6 py-2.5 text-muted-foreground sm:px-8"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </motion.button>
                );
              }

              if (item.action === "orders") {
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    transition={springSnappy}
                    onClick={() => setTrackerOpen(true)}
                    className="relative flex flex-col items-center gap-1 px-6 py-2.5 text-muted-foreground sm:px-8"
                  >
                    <span className="relative">
                      <Icon className="h-5 w-5" />
                      {item.badge > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white"
                        >
                          {item.badge}
                        </motion.span>
                      )}
                    </span>
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </motion.button>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href!}
                  className="relative flex flex-col items-center gap-1 px-6 py-2.5 sm:px-8"
                >
                  {isActive && (
                    <motion.span
                      layoutId="guest-nav-active"
                      className="absolute inset-0 rounded-[1.2rem] bg-[var(--guest-accent-soft)] ring-1 ring-[color-mix(in_oklch,var(--guest-accent)_22%,transparent)]"
                      transition={springSnappy}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex flex-col items-center gap-1 transition-colors",
                      isActive ? "text-[var(--guest-accent)]" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
