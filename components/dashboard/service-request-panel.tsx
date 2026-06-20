"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideProps } from "lucide-react";
import { BellRing, Check, Droplets, Loader2, Receipt, RefreshCw } from "lucide-react";

import { useRestaurantRealtime } from "@/hooks/use-restaurant-realtime";
import { resolveServiceRequestAction } from "@/lib/actions/orders";
import { springSnappy } from "@/lib/motion/presets";
import type { ServiceRequest, ServiceRequestType } from "@/types/order";
import { SERVICE_REQUEST_LABELS } from "@/types/order";

const SERIF = "Georgia, 'Times New Roman', serif";
const C = {
  espresso: "#3d3929",
  terracotta: "#c96442",
  paper: "#faf9f5",
  border: "#e2e0d8",
  inkMuted: "#83827d",
};

const REQUEST_ICONS: Record<ServiceRequestType, React.ComponentType<LucideProps>> = {
  waiter: BellRing,
  water: Droplets,
  bill: Receipt,
};

const REQUEST_EMOJI: Record<ServiceRequestType, string> = {
  waiter: "🛎️",
  water: "💧",
  bill: "🧾",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function ServiceRequestCard({
  request,
  restaurantId,
  onUpdated,
}: {
  request: ServiceRequest;
  restaurantId: string;
  onUpdated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const Icon = REQUEST_ICONS[request.requestType];
  const emoji = REQUEST_EMOJI[request.requestType];
  const isAcknowledged = request.status === "acknowledged";

  function updateStatus(status: "acknowledged" | "resolved") {
    startTransition(async () => {
      await resolveServiceRequestAction(restaurantId, request.id, status);
      onUpdated();
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, x: -10 }}
      transition={springSnappy}
      className="min-w-[200px] max-w-[220px] shrink-0 overflow-hidden rounded-2xl border shadow-sm"
      style={{
        borderColor: isAcknowledged ? C.border : `${C.terracotta}50`,
        background: isAcknowledged ? "hsl(var(--card))" : `${C.terracotta}08`,
      }}
    >
      {/* Chit mini-header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: isAcknowledged ? C.espresso : C.terracotta }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{emoji}</span>
          <p
            className="text-[11px] font-black"
            style={{ color: C.paper, fontFamily: SERIF }}
          >
            {request.tableLabel ? `Table ${request.tableLabel}` : "Walk-in"}
          </p>
        </div>
        {!isAcknowledged && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide"
            style={{ background: "rgba(250,249,245,0.2)", color: C.paper }}
          >
            New
          </span>
        )}
      </div>

      {/* Ruled paper body */}
      <div
        className="px-3.5 py-3"
        style={{
          backgroundImage: "repeating-linear-gradient(transparent,transparent 19px,rgba(0,0,0,0.04) 19px,rgba(0,0,0,0.04) 20px)",
          backgroundPosition: "0 6px",
        }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: isAcknowledged ? "hsl(var(--muted))" : `${C.terracotta}15` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: isAcknowledged ? C.inkMuted : C.terracotta }} />
          </div>
          <div>
            <p className="text-[12px] font-bold" style={{ color: "hsl(var(--foreground))", fontFamily: SERIF }}>
              {SERVICE_REQUEST_LABELS[request.requestType]}
            </p>
            <p className="text-[10px]" style={{ color: C.inkMuted }}>{timeAgo(request.createdAt)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          {!isAcknowledged ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => updateStatus("acknowledged")}
              className="flex-1 rounded-xl py-1.5 text-[11px] font-black text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: C.espresso }}
            >
              {isPending ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : "On my way"}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex-1 rounded-xl py-1.5 text-[11px] font-bold"
              style={{ background: "hsl(var(--muted))", color: C.inkMuted }}
            >
              Acknowledged
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => updateStatus("resolved")}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-black text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: isAcknowledged ? C.terracotta : "hsl(var(--muted))", color: isAcknowledged ? C.paper : C.inkMuted }}
          >
            <Check className="h-3 w-3" />
            Done
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function ServiceRequestPanel({
  restaurantId,
  initialRequests,
}: {
  restaurantId: string;
  initialRequests: ServiceRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/v1/dashboard/${restaurantId}/service-requests`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => { setRequests(initialRequests); }, [initialRequests]);

  const { connected: realtimeConnected } = useRestaurantRealtime(restaurantId, refresh, { scope: "service-requests", tables: ["service_requests"] });

  useEffect(() => {
    if (realtimeConnected) return;
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh, realtimeConnected]);

  if (requests.length === 0) return null;

  const newCount = requests.filter((r) => r.status === "open").length;

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: `${C.terracotta}35` }}>
      {/* Chit header */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ background: C.espresso }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(250,249,245,0.4)" }}>
            Live requests
          </p>
          <h2
            className="text-base font-black"
            style={{ color: C.paper, fontFamily: SERIF }}
          >
            Service Requests 🛎️
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <span
              className="flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white"
              style={{ background: C.terracotta }}
            >
              {newCount} new
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ background: "rgba(250,249,245,0.1)" }}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} style={{ color: C.paper }} />
          </button>
        </div>
      </div>

      {/* Torn paper edge */}
      <svg viewBox="0 0 600 10" preserveAspectRatio="none" className="block w-full" style={{ height: 10, marginTop: -1 }}>
        <path d="M0,0 L0,10 L12,3 L24,8 L36,2 L48,8 L60,2 L72,8 L84,3 L96,8 L108,2 L120,8 L132,3 L144,8 L156,2 L168,8 L180,3 L192,8 L204,2 L216,8 L228,3 L240,8 L252,2 L264,8 L276,3 L288,8 L300,2 L312,8 L324,3 L336,8 L348,2 L360,8 L372,3 L384,8 L396,2 L408,8 L420,3 L432,8 L444,2 L456,8 L468,3 L480,8 L492,2 L504,8 L516,3 L528,8 L540,2 L552,8 L564,3 L576,8 L588,2 L600,7 L600,0 Z" style={{ fill: C.espresso }} />
        <path d="M0,10 L12,3 L24,8 L36,2 L48,8 L60,2 L72,8 L84,3 L96,8 L108,2 L120,8 L132,3 L144,8 L156,2 L168,8 L180,3 L192,8 L204,2 L216,8 L228,3 L240,8 L252,2 L264,8 L276,3 L288,8 L300,2 L312,8 L324,3 L336,8 L348,2 L360,8 L372,3 L384,8 L396,2 L408,8 L420,3 L432,8 L444,2 L456,8 L468,3 L480,8 L492,2 L504,8 L516,3 L528,8 L540,2 L552,8 L564,3 L576,8 L588,2 L600,7 L600,10 Z" fill="hsl(var(--card))" />
      </svg>

      {/* Scrollable cards */}
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-4 pt-3 scrollbar-none"
        style={{
          backgroundImage: "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.025) 23px,rgba(0,0,0,0.025) 24px)",
          backgroundPosition: "0 4px",
        }}
      >
        <AnimatePresence mode="popLayout">
          {requests.map((request) => (
            <ServiceRequestCard
              key={request.id}
              request={request}
              restaurantId={restaurantId}
              onUpdated={refresh}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
