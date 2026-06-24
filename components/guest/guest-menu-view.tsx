"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplets,
  Drumstick,
  Flame,
  Gift,
  Leaf,
  Loader2,
  Receipt,
  Search,
  Sparkles,
  Star,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { FeaturedItemCard } from "@/components/guest/featured-item-card";
import { useGuestCart } from "@/components/guest/guest-cart-provider";
import { GuestIdentityDialog } from "@/components/guest/guest-identity-dialog";
import { MenuItemCard } from "@/components/guest/menu-item-card";
import { MenuItemDetailSheet } from "@/components/guest/menu-item-detail-sheet";
import { RestaurantHero } from "@/components/guest/restaurant-hero";
import { SmartSuggestionBanner } from "@/components/guest/smart-suggestion-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { springGentle, springSnappy } from "@/lib/motion/presets";
import type { GuestMenu, GuestMenuItem } from "@/types/guest";
import { formatMenuPrice } from "@/types/guest";

type Tab = "discover" | "menu" | "orders";

function isValidIndianPhone(phone: string) {
  return /^[6-9]\d{9}$/.test(phone);
}

/* ── Section title in serif — the paper "heading" style ─────────────────── */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2
        className="text-base font-bold tracking-tight text-[var(--guest-ink)]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {children}
      </h2>
      <div className="flex-1 border-t border-dashed border-[var(--guest-border)]" />
    </div>
  );
}

/* ── Tab Bar — pill style, espresso active ───────────────────────────────── */
function TabBar({
  active,
  onChange,
  ordersBadge,
  orderingEnabled,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  ordersBadge: boolean;
  orderingEnabled: boolean;
}) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "menu",     label: "Menu",     icon: <UtensilsCrossed className="h-3 w-3" /> },
    ...(orderingEnabled
      ? [{ id: "orders" as const, label: "Orders", icon: <Clock className="h-3 w-3" /> }]
      : []),
  ];

  return (
    <div
      className="sticky top-0 z-30 px-4 py-3 sm:px-6"
      style={{ background: "rgba(250,249,245,0.92)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="flex items-center gap-1 rounded-xl p-1"
        style={{ background: "var(--guest-border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold transition-colors"
            style={{
              color: active === tab.id
                ? "var(--guest-header-ink)"
                : "var(--guest-ink-muted)",
            }}
          >
            {active === tab.id && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 rounded-lg"
                style={{ background: "var(--guest-header-bg)" }}
                transition={springSnappy}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
              {tab.id === "orders" && ordersBadge && active !== "orders" && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── DISCOVER TAB ────────────────────────────────────────────────────────── */

interface LoyaltyData {
  points: number;
  tasteProfile: { top_items: string[]; avg_spend: number } | null;
  redemptionsCount: number;
  pointsPerOrder: number;
  redemptionThreshold: number;
  rewardTitle: string;
  rewardDescription: string | null;
}

function buildSuggestions(items: GuestMenuItem[]): string[] {
  const tagFreq = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
  }
  const topTags = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
  const staples = ["spicy", "cold coffee", "veg", "sweet", "quick bite"];
  return [...new Set([...topTags, ...staples])].slice(0, 6);
}

const CHIP_EMOJIS: Record<string, string> = {
  spicy: "🌶️", coffee: "☕", "cold coffee": "🧊", veg: "🌿", sweet: "🍮",
  "quick bite": "⚡", chicken: "🍗", tea: "🍵", dessert: "🍰",
  smoothie: "🥤", snack: "🍟", fried: "🔥",
};

function DiscoverTab({ menu }: { menu: GuestMenu }) {
  const { customerPhone, customerName, saveIdentity, sessionReady, requestService, tableLabel } = useGuestCart();
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<GuestMenuItem[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GuestMenuItem | null>(null);
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);
  const [returnPhone, setReturnPhone] = useState("");
  const [returnPhoneError, setReturnPhoneError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  useEffect(() => {
    if (sessionReady && !customerPhone) {
      const t = setTimeout(() => setShowReturnPrompt(true), 800);
      return () => clearTimeout(t);
    }
  }, [sessionReady, customerPhone]);

  useEffect(() => {
    if (!customerPhone) return;
    fetch("/api/v1/guest/loyalty")
      .then((r) => r.json())
      .then((d) => { if (d.loyalty) setLoyalty(d.loyalty); })
      .catch(() => {});
  }, [customerPhone]);

  async function handleService(type: "waiter" | "water" | "bill") {
    setServiceMessage(null);
    const result = await requestService(type);
    setServiceMessage(result.error ? result.error : "Request sent — staff will be right with you.");
    setTimeout(() => setServiceMessage(null), 4000);
  }

  async function handleReturnLookup() {
    setReturnPhoneError(null);
    if (!isValidIndianPhone(returnPhone.trim())) {
      setReturnPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    setIsLookingUp(true);
    await saveIdentity(returnPhone.trim(), "");
    setIsLookingUp(false);
    setShowReturnPrompt(false);
  }

  const allItems = useMemo(() => menu.categories.flatMap((c) => c.items), [menu.categories]);
  const suggestions = useMemo(() => buildSuggestions(allItems), [allItems]);

  function runSearch(q: string) {
    const query = q.trim().toLowerCase();
    if (!query) return;
    setAiQuery(q);
    setAiLoading(true);
    setAiResults(null);
    const matched = allItems.filter((item) => {
      const text = `${item.name} ${item.description ?? ""} ${item.tags.join(" ")} ${item.dietaryType}`.toLowerCase();
      return text.includes(query);
    });
    setAiResults(matched);
    setAiLoading(false);
  }

  const pointsNeeded = loyalty ? Math.max(0, loyalty.redemptionThreshold - loyalty.points) : 0;

  return (
    <div className="px-4 pt-4 sm:px-6" style={{ paddingBottom: "7rem" }}>
      {/* Welcome banner */}
      <AnimatePresence>
        {customerName && !welcomeDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springGentle}
            className="mb-4 flex items-center justify-between rounded-xl border border-[var(--guest-accent)]/25 px-4 py-3"
            style={{ background: "linear-gradient(135deg,#fdf4ef,#faf9f5)" }}
          >
            <div>
              <p className="text-sm font-bold text-[var(--guest-accent)]">
                Welcome back, {customerName}! 👋
              </p>
              <p className="mt-0.5 text-xs text-[var(--guest-ink-muted)]">
                Great to see you again.
              </p>
            </div>
            <button type="button" onClick={() => setWelcomeDismissed(true)}
              className="ml-2 text-[var(--guest-ink-muted)] transition-colors hover:text-[var(--guest-ink)]">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loyalty card */}
      <AnimatePresence>
        {loyalty && loyalty.points > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={springGentle}
            className="mb-4 overflow-hidden rounded-xl border border-[var(--guest-border)] bg-[var(--guest-surface)]"
          >
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "#fdf4ef", color: "#c96442" }}>
                  {pointsNeeded === 0 ? <Gift className="h-5 w-5" /> : <Star className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--guest-ink)]">
                    {loyalty.points} points
                    {loyalty.redemptionsCount > 0 && (
                      <span className="ml-2 rounded-sm px-1.5 py-0.5 text-[9px] font-bold"
                        style={{ background: "#fdf4ef", color: "#c96442" }}>
                        {loyalty.redemptionsCount}× redeemed
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--guest-ink-muted)]">
                    {pointsNeeded > 0
                      ? `${pointsNeeded} more to earn a ${loyalty.rewardTitle}`
                      : `You've earned a ${loyalty.rewardTitle} — tell your server!`}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--guest-border)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (loyalty.points / loyalty.redemptionThreshold) * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: pointsNeeded === 0 ? "#2e7d32" : "#c96442" }}
                  />
                </div>
              </div>
            </div>
            {loyalty.tasteProfile?.top_items && loyalty.tasteProfile.top_items.length > 0 && (
              <div className="border-t border-dashed border-[var(--guest-border)] px-4 py-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--guest-ink-muted)]">Your favourites</p>
                <div className="flex flex-wrap gap-1.5">
                  {loyalty.tasteProfile.top_items.slice(0, 4).map((item) => (
                    <button key={item} type="button" onClick={() => runSearch(item)}
                      className="rounded-sm px-2.5 py-1 text-xs font-semibold transition-colors"
                      style={{ background: "#fdf4ef", color: "#c96442" }}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return visitor prompt */}
      <AnimatePresence>
        {showReturnPrompt && !customerPhone && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={springGentle}
            className="mb-4 overflow-hidden rounded-xl border border-[var(--guest-border)] bg-[var(--guest-surface)] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[var(--guest-ink)]" style={{ fontFamily: "Georgia, serif" }}>Been here before?</p>
                <p className="mt-0.5 text-xs text-[var(--guest-ink-muted)]">
                  Enter your number to see your points &amp; favourites.
                </p>
              </div>
              <button type="button" onClick={() => setShowReturnPrompt(false)}
                className="text-[var(--guest-ink-muted)] transition-colors hover:text-[var(--guest-ink)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="flex shrink-0 items-center rounded-lg border border-[var(--guest-border)] bg-[var(--guest-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--guest-ink-muted)]">
                +91
              </span>
              <input
                type="tel"
                value={returnPhone}
                onChange={(e) => setReturnPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onKeyDown={(e) => e.key === "Enter" && handleReturnLookup()}
                placeholder="Mobile number"
                inputMode="numeric"
                style={{ fontSize: "16px" }}
                className="w-full rounded-lg border border-[var(--guest-border)] bg-[var(--guest-bg)] px-3 py-2.5 text-[var(--guest-ink)] outline-none transition-colors focus:border-[var(--guest-accent)]"
              />
              <button type="button" onClick={handleReturnLookup} disabled={isLookingUp}
                className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "var(--guest-accent)" }}>
                {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
              </button>
            </div>
            {returnPhoneError && <p className="mt-1.5 text-xs text-destructive">{returnPhoneError}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Search */}
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--guest-ink-muted)]">
          Smart Search
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--guest-ink-muted)]" />
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(aiQuery)}
              placeholder="spicy, cold coffee, veg…"
              className="w-full rounded-xl border border-[var(--guest-border)] bg-[var(--guest-surface)] py-3 pl-10 pr-4 text-sm text-[var(--guest-ink)] outline-none placeholder:text-[var(--guest-ink-muted)]/50 transition-all focus:border-[var(--guest-accent)] focus:ring-2 focus:ring-[var(--guest-accent)]/10"
            />
          </div>
          <button
            type="button"
            onClick={() => runSearch(aiQuery)}
            disabled={aiLoading || !aiQuery.trim()}
            className="flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--guest-accent)" }}
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        {aiResults === null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <motion.button
                key={s}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => runSearch(s)}
                className="flex items-center gap-1.5 rounded-full border border-[var(--guest-border)] bg-[var(--guest-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--guest-ink-muted)] transition-all active:scale-95 hover:border-[var(--guest-accent)]/40 hover:text-[var(--guest-ink)]"
              >
                <span>{CHIP_EMOJIS[s] ?? "✦"}</span>
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Search results */}
      <AnimatePresence>
        {aiResults !== null && (
          <motion.div
            key="ai-results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={springGentle}
            className="mb-8"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--guest-ink)]">
                {aiResults.length > 0
                  ? `${aiResults.length} match${aiResults.length !== 1 ? "es" : ""} for "${aiQuery}"`
                  : `Nothing found for "${aiQuery}"`}
              </p>
              <button type="button" onClick={() => { setAiResults(null); setAiQuery(""); }}
                className="text-xs font-semibold text-[var(--guest-ink-muted)] hover:text-[var(--guest-ink)]">
                Clear
              </button>
            </div>
            {aiResults.length > 0 ? (
              <div className="space-y-2.5">
                {aiResults.map((item, index) => (
                  <MenuItemCard key={item.id} item={item} currency={menu.restaurant.currency} index={index} onSelect={setSelectedItem} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--guest-border)] px-6 py-10 text-center">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm font-semibold text-[var(--guest-ink)]">No matches</p>
                <p className="mt-1 text-xs text-[var(--guest-ink-muted)]">Try "coffee", "veg" or "spicy"</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service buttons */}
      {tableLabel && (
        <div className="mb-7">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--guest-ink-muted)]">Need help?</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: "waiter" as const, label: "Call Waiter", icon: BellRing },
              { type: "water"  as const, label: "Water",       icon: Droplets },
              { type: "bill"   as const, label: "Bring Bill",  icon: Receipt },
            ].map((a) => (
              <button
                key={a.type}
                type="button"
                onClick={() => handleService(a.type)}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--guest-border)] bg-[var(--guest-surface)] py-4 text-xs font-semibold text-[var(--guest-ink)] transition-all active:scale-95 hover:border-[var(--guest-accent)]/30"
              >
                <a.icon className="h-[1.125rem] w-[1.125rem]" />
                {a.label}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {serviceMessage && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-2.5 text-center text-xs text-[var(--guest-ink-muted)]">
                {serviceMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Specials */}
      {!aiResults && menu.specialItems.length > 0 && (
        <div className="mb-7">
          <SectionHeading>✦ Today&apos;s Specials</SectionHeading>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
            {menu.specialItems.map((item) => (
              <FeaturedItemCard key={item.id} item={item} currency={menu.restaurant.currency}
                accent="special" primaryColor={menu.restaurant.primaryColor} onSelect={setSelectedItem} />
            ))}
          </div>
        </div>
      )}

      {/* Popular */}
      {!aiResults && menu.popularItems.length > 0 && (
        <div className="mb-6">
          <SectionHeading><Flame className="inline h-4 w-4 -translate-y-px" /> Most Popular</SectionHeading>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
            {menu.popularItems.map((item) => (
              <FeaturedItemCard key={item.id} item={item} currency={menu.restaurant.currency}
                accent="popular" primaryColor={menu.restaurant.primaryColor} onSelect={setSelectedItem} />
            ))}
          </div>
        </div>
      )}

      {/* Fallback: nothing curated as special/popular yet — still show real menu items */}
      {!aiResults && menu.specialItems.length === 0 && menu.popularItems.length === 0 && (
        allItems.length > 0 ? (
          <div className="mb-6">
            <SectionHeading><UtensilsCrossed className="inline h-4 w-4 -translate-y-px" /> From the Menu</SectionHeading>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
              {allItems.slice(0, 8).map((item) => (
                <FeaturedItemCard key={item.id} item={item} currency={menu.restaurant.currency}
                  accent="menu" primaryColor={menu.restaurant.primaryColor} onSelect={setSelectedItem} />
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-dashed border-[var(--guest-border)] px-6 py-14 text-center">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-sm font-semibold text-[var(--guest-ink)]">Menu coming soon</p>
            <p className="mt-1 text-xs text-[var(--guest-ink-muted)]">Check back shortly — we&apos;re getting things ready.</p>
          </div>
        )
      )}

      <MenuItemDetailSheet item={selectedItem} currency={menu.restaurant.currency}
        open={Boolean(selectedItem)} onOpenChange={(o) => { if (!o) setSelectedItem(null); }} />
    </div>
  );
}

/* ── MENU TAB ────────────────────────────────────────────────────────────── */

type DietFilter = "all" | "veg" | "non_veg" | "popular";

const DIET_FILTERS: { id: DietFilter; label: string; icon: typeof Leaf | null }[] = [
  { id: "all",     label: "All",      icon: null },
  { id: "veg",     label: "Veg",      icon: Leaf },
  { id: "non_veg", label: "Non-Veg",  icon: Drumstick },
  { id: "popular", label: "Popular",  icon: Flame },
];

const DIET_FILTER_LABEL: Record<DietFilter, string> = {
  all: "All",
  veg: "Veg",
  non_veg: "Non-Veg",
  popular: "Popular",
};

function SectionNav({
  sections, activeId, onChange,
}: {
  sections: { id: string; name: string; emoji: string | null }[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector("[data-active='true']") as HTMLElement | null;
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  return (
    <div ref={scrollRef}
      className="flex gap-2.5 overflow-x-auto px-4 pb-3.5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
      {[{ id: null, name: "All", emoji: null }, ...sections].map((s) => {
        const isActive = activeId === s.id;
        return (
          <motion.button key={s.id ?? "all"} type="button" data-active={isActive}
            whileTap={{ scale: 0.94 }} transition={springSnappy}
            onClick={() => onChange(s.id)}
            className={`shrink-0 flex items-center gap-1.5 rounded-2xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
              isActive
                ? "border-transparent text-white shadow-md"
                : "border-[var(--guest-border)] bg-[var(--guest-surface)] text-[var(--guest-ink)] hover:border-[var(--guest-accent)]/40"
            }`}
            style={isActive ? { background: "var(--guest-header-bg)" } : undefined}
          >
            {s.emoji && <span>{s.emoji}</span>}
            {s.name}
          </motion.button>
        );
      })}
    </div>
  );
}

function MenuTab({ menu }: { menu: GuestMenu }) {
  const [query, setQuery] = useState("");
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<GuestMenuItem | null>(null);

  const hasSections = menu.sections.length > 0;

  const filteredCategories = useMemo(() => {
    return menu.categories
      .filter((cat) => activeSectionId === null || cat.sectionId === activeSectionId)
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          const matchesQuery = query.trim()
            ? `${item.name} ${item.description ?? ""} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())
            : true;
          const matchesDiet =
            dietFilter === "all"     ? true :
            dietFilter === "popular" ? item.isPopular :
            dietFilter === "veg"     ? (item.dietaryType === "veg" || item.dietaryType === "vegan") :
            item.dietaryType === "non_veg";
          return matchesQuery && matchesDiet;
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menu.categories, query, dietFilter, activeSectionId]);

  function toggleCategory(id: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="pb-28">
      <div className="pt-3">
      </div>

      {/* Sticky search + filters */}
      <div className="sticky top-[52px] z-20 pb-1 sm:top-[60px]" style={{ background: "rgba(250,249,245,0.95)", backdropFilter: "blur(10px)" }}>
        <div className="px-4 pt-2.5 pb-2 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--guest-ink-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu…"
              style={{ fontSize: "16px" }}
              className="w-full rounded-xl border border-[var(--guest-border)] bg-[var(--guest-surface)] py-2.5 pl-10 pr-9 text-[var(--guest-ink)] outline-none placeholder:text-[var(--guest-ink-muted)]/50 transition-all focus:border-[var(--guest-accent)] focus:ring-2 focus:ring-[var(--guest-accent)]/10"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--guest-ink-muted)] hover:text-[var(--guest-ink)]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {hasSections && <SectionNav sections={menu.sections} activeId={activeSectionId} onChange={setActiveSectionId} />}
        <div className="flex gap-2 overflow-x-auto px-4 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
          {DIET_FILTERS.map((f) => {
            const isActive = dietFilter === f.id;
            return (
              <motion.button key={f.id} type="button" whileTap={{ scale: 0.94 }} transition={springSnappy}
                onClick={() => setDietFilter(f.id)}
                className={`shrink-0 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "border-transparent text-white shadow-sm"
                    : "border-[var(--guest-border)] bg-[var(--guest-surface)] text-[var(--guest-ink-muted)] hover:text-[var(--guest-ink)]"
                }`}
                style={isActive ? { background: "var(--guest-accent)" } : undefined}
              >
                {f.icon && <f.icon className="h-3 w-3" />}
                {f.label}
              </motion.button>
            );
          })}
        </div>
        <div className="mx-4 border-t border-dashed border-[var(--guest-border)] sm:mx-6" />
      </div>

      <div className="px-4 pt-5 sm:px-6">
        {filteredCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--guest-border)] px-6 py-14 text-center">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-sm font-semibold text-[var(--guest-ink)]">
              {query ? `No items match "${query}"` : `No ${DIET_FILTER_LABEL[dietFilter]} items`}
            </p>
            {(dietFilter !== "all" || activeSectionId !== null) && (
              <button type="button" onClick={() => { setDietFilter("all"); setActiveSectionId(null); }}
                className="mt-3 text-xs font-semibold hover:opacity-80" style={{ color: "var(--guest-accent)" }}>
                Show all items
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((category) => {
              const collapsed = collapsedCategories.has(category.id) && !query;
              return (
                <div key={category.id}>
                  <button type="button" onClick={() => !query && toggleCategory(category.id)}
                    className="mb-3 flex w-full items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-base font-bold tracking-tight text-[var(--guest-ink)]"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                        {category.name}
                      </h2>
                      <span className="text-[11px] font-semibold text-[var(--guest-ink-muted)]">
                        {category.items.length}
                      </span>
                    </div>
                    {!query && (collapsed
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-[var(--guest-ink-muted)]" />
                      : <ChevronUp className="h-4 w-4 shrink-0 text-[var(--guest-ink-muted)]" />
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div key="items"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="overflow-hidden">
                        <div className="space-y-2.5">
                          {category.items.map((item, index) => (
                            <MenuItemCard key={item.id} item={item} currency={menu.restaurant.currency}
                              index={index} onSelect={setSelectedItem} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MenuItemDetailSheet item={selectedItem} currency={menu.restaurant.currency}
        open={Boolean(selectedItem)} onOpenChange={(o) => { if (!o) setSelectedItem(null); }} />
    </div>
  );
}

/* ── ORDERS TAB ──────────────────────────────────────────────────────────── */

interface GuestOrder {
  id: string; status: string; subtotalCents: number; itemCount: number;
  notes: string | null; createdAt: string;
  items: { id: string; name: string; quantity: number; priceCents: number }[];
}

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; color: string }> = {
  pending:   { label: "Pending",   dot: "#f59e0b", bg: "#fffbeb", color: "#92400e" },
  confirmed: { label: "Confirmed", dot: "#3b82f6", bg: "#eff6ff", color: "#1e40af" },
  served:    { label: "Served",    dot: "#9ca3af", bg: "#f9fafb", color: "#6b7280" },
  cancelled: { label: "Cancelled", dot: "#ef4444", bg: "#fef2f2", color: "#991b1b" },
};

function OrdersTab({ currency, onTabChange }: { currency: string; onTabChange: (t: Tab) => void }) {
  const { activeOrders, sessionReady, requestService, tableLabel } = useGuestCart();
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [serviceLoading, setServiceLoading] = useState<string | null>(null);
  const loading = !sessionReady;

  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const orders: GuestOrder[] = activeOrders
    .filter((o) => new Date(o.createdAt) > twoMonthsAgo)
    .map((o) => ({
      id: o.id, status: o.status, subtotalCents: o.subtotalCents,
      itemCount: o.itemCount, notes: o.notes, createdAt: o.createdAt,
      items: o.items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, priceCents: i.priceCents })),
    }));

  async function handleService(type: "waiter" | "water" | "bill") {
    setServiceMessage(null);
    setServiceLoading(type);
    const result = await requestService(type);
    setServiceLoading(null);
    if (result.error) { setServiceMessage(result.error); return; }
    setServiceMessage("Request sent — staff will be with you shortly.");
    setTimeout(() => setServiceMessage(null), 4000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--guest-ink-muted)]" />
      </div>
    );
  }

  const serviceActions = [
    { type: "waiter" as const, label: "Call waiter", icon: BellRing },
    { type: "water"  as const, label: "Water",       icon: Droplets },
    { type: "bill"   as const, label: "Get bill",    icon: Receipt },
  ];

  return (
    <div className="px-4 pb-28 pt-4 sm:px-6 space-y-5">

      {/* Orders section */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--guest-ink-muted)]">
          This visit · past 2 months
        </p>

        {!orders?.length ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--guest-border)] px-6 py-14 text-center">
            <div className="mb-3 text-5xl">🍽️</div>
            <p className="font-bold text-[var(--guest-ink)]" style={{ fontFamily: "Georgia, serif" }}>No orders yet</p>
            <p className="mt-1 text-sm text-[var(--guest-ink-muted)]">Orders from this table will appear here.</p>
            <button type="button" onClick={() => onTabChange("menu")}
              className="mt-5 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: "var(--guest-accent)" }}>
              Browse menu →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => {
              const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
              return (
                <motion.div key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, ...springGentle }}
                  className="overflow-hidden rounded-xl border border-[var(--guest-border)]"
                  style={{ background: "var(--guest-surface)" }}
                >
                  {/* Chit mini-header */}
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--guest-header-bg)" }}>
                    <p className="text-[11px] font-black" style={{ color: "var(--guest-header-ink)", fontFamily: "Georgia, serif" }}>
                      {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-black"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Items list */}
                  {order.items.length > 0 && (
                    <ul className="border-t border-dashed border-[var(--guest-border)] px-4 py-3 space-y-1.5">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--guest-ink-muted)" }}>
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-black"
                            style={{ background: "var(--guest-border)", color: "var(--guest-ink)" }}>
                            {item.quantity}
                          </span>
                          <span style={{ fontFamily: "Georgia, serif", color: "var(--guest-ink)" }}>{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Timestamp footer */}
                  <div className="border-t border-dashed border-[var(--guest-border)] px-4 py-2">
                    <p className="text-[10px]" style={{ color: "var(--guest-ink-muted)" }}>
                      {new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Need help? — service requests */}
      {tableLabel && (
        <div className="overflow-hidden rounded-xl border border-[var(--guest-border)]">
          {/* Dark chit header */}
          <div className="px-4 py-3" style={{ background: "var(--guest-header-bg)" }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(250,249,245,0.4)" }}>
              At the table
            </p>
            <p className="text-sm font-black" style={{ color: "var(--guest-header-ink)", fontFamily: "Georgia, serif" }}>
              Need something?
            </p>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-3 gap-2.5 px-4 pb-4 pt-3" style={{ background: "var(--guest-surface)" }}>
            {serviceActions.map((action) => (
              <button
                key={action.type}
                type="button"
                disabled={serviceLoading === action.type}
                onClick={() => handleService(action.type)}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--guest-border)] py-4 text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
                style={{ background: "var(--guest-bg)", color: "var(--guest-ink)" }}
              >
                {serviceLoading === action.type
                  ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--guest-accent)" }} />
                  : <action.icon className="h-5 w-5" />
                }
                <span style={{ fontFamily: "Georgia, serif" }}>{action.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {serviceMessage && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pb-3 text-center text-xs"
                style={{ color: "var(--guest-accent)" }}
              >
                {serviceMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ── MAIN ────────────────────────────────────────────────────────────────── */

export function GuestMenuView({ menu }: { menu: GuestMenu }) {
  const [activeTab, setActiveTab] = useState<Tab>("menu");
  const [ordersBadge, setOrdersBadge] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const itemCount = menu.categories.reduce((t, c) => t + c.items.length, 0);
  const { sessionReady, tableLabel, customerPhone, saveIdentity } = useGuestCart();

  useEffect(() => {
    if (sessionReady && tableLabel && !customerPhone) {
      const t = setTimeout(() => setIdentityOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [sessionReady, tableLabel, customerPhone]);

  useEffect(() => {
    function handleOrderPlaced() { setActiveTab("orders"); setOrdersBadge(true); }
    window.addEventListener("parcha:order-placed", handleOrderPlaced);
    return () => window.removeEventListener("parcha:order-placed", handleOrderPlaced);
  }, []);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab === "orders") setOrdersBadge(false);
  }

  return (
    <div className="mx-auto max-w-lg">
      <RestaurantHero restaurant={menu.restaurant} itemCount={itemCount} categoryCount={menu.categories.length} />

      <TabBar
        active={activeTab}
        onChange={handleTabChange}
        ordersBadge={ordersBadge}
        orderingEnabled={menu.restaurant.orderingEnabled}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {activeTab === "discover" && <DiscoverTab menu={menu} />}
          {activeTab === "menu"     && <MenuTab menu={menu} />}
          {activeTab === "orders"   && menu.restaurant.orderingEnabled && (
            <OrdersTab currency={menu.restaurant.currency} onTabChange={handleTabChange} />
          )}
        </motion.div>
      </AnimatePresence>

      <GuestIdentityDialog
        open={identityOpen}
        onClose={() => setIdentityOpen(false)}
        onConfirm={async ({ phone, name }) => {
          await saveIdentity(phone, name);
          setIdentityOpen(false);
        }}
      />
    </div>
  );
}

export function GuestMenuSkeleton() {
  return (
    <div className="mx-auto max-w-lg pb-24">
      {/* Dark header skeleton */}
      <div className="px-5 pb-5 pt-8" style={{ background: "#3d3929" }}>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 rounded" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="h-3 w-24 rounded" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 sm:px-6">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="space-y-3 px-4 pt-2">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}
