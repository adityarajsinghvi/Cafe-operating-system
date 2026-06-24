import Link from "next/link";
import { ArrowRight, BookOpen, Clock, History, QrCode, Settings, Star, Users } from "lucide-react";

import { getRestaurantById } from "@/services/restaurants.service";
import { getPublishedMenuStats } from "@/services/menu.service";
import { getActiveOrderCounts } from "@/services/orders.service";
import { getFeatures } from "@/lib/features";
import { GrantStampSheet } from "@/components/dashboard/grant-stamp-sheet";

/* ── Chit-style section header ───────────────────────────────────────────── */
function ChitHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
      >
        {children}
      </h2>
      <div className="flex-1 border-t border-dashed border-border" />
    </div>
  );
}

/* ── Single shortcut card ────────────────────────────────────────────────── */
function ShortcutCard({
  href,
  emoji,
  label,
  desc,
  badge,
  badgeColor = "#c96442",
}: {
  href: string;
  emoji: string;
  label: string;
  desc: string;
  badge?: string | number;
  badgeColor?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-[#c96442]/30 hover:shadow-md hover:shadow-black/5 active:scale-[0.98]"
    >
      {badge !== undefined && (
        <span
          className="absolute right-3 top-3 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white"
          style={{ background: badgeColor }}
        >
          {badge}
        </span>
      )}
      <span className="text-2xl">{emoji}</span>
      <div>
        <p
          className="text-sm font-bold tracking-tight text-foreground"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {label}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[#c96442]" />
    </Link>
  );
}

export default async function RestaurantHomePage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const [restaurant, stats, orderCounts] = await Promise.all([
    getRestaurantById(restaurantId),
    getPublishedMenuStats(restaurantId),
    getActiveOrderCounts(restaurantId),
  ]);

  const features = restaurant ? getFeatures(restaurant) : null;

  const hasMenu = (stats?.itemCount ?? 0) > 0;
  const activeOrders = orderCounts?.activeCount ?? 0;
  const pendingOrders = activeOrders;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">

      {/* ── Header chit ── */}
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        {/* Dark espresso band */}
        <div className="px-5 py-4" style={{ background: "#3d3929" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-lg font-black tracking-tight"
                style={{ color: "#faf9f5", fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {restaurant?.name ?? "Your Restaurant"}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "rgba(250,249,245,0.5)" }}>
                Status: {restaurant?.status ?? "trial"}
                {hasMenu && ` · ${stats?.categoryCount} categories · ${stats?.itemCount} items`}
              </p>
            </div>
            {pendingOrders > 0 && (
              <div
                className="chit-stamp h-12 w-12 shrink-0 flex-col gap-0 text-[7px]"
                style={{ borderColor: "#d97706", color: "#92400e", background: "#fffbeb" }}
              >
                <span className="text-lg font-black leading-none" style={{ color: "#d97706" }}>
                  {pendingOrders}
                </span>
                <span>NEW</span>
              </div>
            )}
          </div>
        </div>

        {/* Ruled paper body */}
        <div
          className="parcha-ruled px-5 py-4"
          style={{ backgroundPosition: "0 0" }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {hasMenu ? (
              <Link
                href={`/r/${restaurant?.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <QrCode className="h-3.5 w-3.5" />
                /r/{restaurant?.slug}
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">No menu yet — add one below</span>
            )}
            {activeOrders > 0 && (
              <Link
                href={`/dashboard/${restaurantId}/orders`}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "#c96442" }}
              >
                <Clock className="h-3.5 w-3.5" />
                {activeOrders} active order{activeOrders !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Grant Stamp (loyalty plan) ── */}
      {features?.loyalty && (
        <GrantStampSheet restaurantId={restaurantId} />
      )}

      {/* ── Quick shortcuts ── */}
      <div>
        <ChitHeading>Quick actions</ChitHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ShortcutCard
            href={`/dashboard/${restaurantId}/orders`}
            emoji="🧾"
            label="Live Orders"
            desc="Advance orders through the kitchen in real time."
            badge={activeOrders > 0 ? activeOrders : undefined}
            badgeColor="#d97706"
          />
          <ShortcutCard
            href={hasMenu ? `/dashboard/${restaurantId}/menu` : `/dashboard/${restaurantId}/menu/onboarding`}
            emoji="📋"
            label={hasMenu ? "Edit Menu" : "Add Menu"}
            desc={hasMenu ? `${stats?.itemCount} items across ${stats?.categoryCount} categories.` : "Upload your printed menu — AI structures it for you."}
          />
          <ShortcutCard
            href={`/r/${restaurant?.slug}`}
            emoji="📱"
            label="Guest View"
            desc="See your menu exactly as guests see it."
          />
          <ShortcutCard
            href={`/dashboard/${restaurantId}/customers`}
            emoji="👥"
            label="Customers"
            desc="See your regulars, their favourites, and loyalty points."
          />
          <ShortcutCard
            href={`/dashboard/${restaurantId}/rewards`}
            emoji="⭐"
            label="Rewards"
            desc="Configure loyalty points and redeem rewards."
          />
          <ShortcutCard
            href={`/dashboard/${restaurantId}/history`}
            emoji="📜"
            label="History"
            desc="Browse completed and cancelled orders."
          />
          <ShortcutCard
            href={`/dashboard/${restaurantId}/settings`}
            emoji="⚙️"
            label="Settings"
            desc="Restaurant profile, branding, and preferences."
          />
        </div>
      </div>

      {/* ── Tip if no menu ── */}
      {!hasMenu && (
        <div
          className="overflow-hidden rounded-xl border border-dashed border-[#c96442]/40"
          style={{ background: "rgba(201,100,66,0.04)" }}
        >
          <div className="px-5 py-4">
            <p
              className="mb-1 font-bold text-foreground"
              style={{ fontFamily: "Georgia, serif" }}
            >
              ✦ First step: add your menu
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Upload a photo or PDF of your existing menu. Our AI reads it and
              structures every item, price, and category — ready to review in seconds.
            </p>
            <Link
              href={`/dashboard/${restaurantId}/menu/onboarding`}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: "#c96442" }}
            >
              Start menu onboarding
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
