"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

import { useGuestCart } from "@/components/guest/guest-cart-provider";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion/presets";
import type { GuestMenuItem } from "@/types/guest";
import { formatMenuPrice } from "@/types/guest";
import type { DietaryType } from "@/types/menu";

const DIETARY_DOT: Record<DietaryType, string> = {
  veg:     "bg-emerald-600",
  vegan:   "bg-green-700",
  egg:     "bg-amber-500",
  non_veg: "bg-red-600",
  unknown: "bg-[var(--guest-border)]",
};

const DIETARY_LABEL: Record<DietaryType, string> = {
  veg:     "Veg",
  vegan:   "Vegan",
  egg:     "Egg",
  non_veg: "Non-Veg",
  unknown: "",
};

export function MenuItemCard({
  item,
  currency,
  compact = false,
  className,
  index = 0,
  onSelect,
}: {
  item: GuestMenuItem;
  currency: string;
  compact?: boolean;
  className?: string;
  index?: number;
  onSelect?: (item: GuestMenuItem) => void;
}) {
  const { lines, addItem, updateQuantity } = useGuestCart();
  const cartLine = lines.find((l) => l.menuItemId === item.id);
  const quantity = cartLine?.quantity ?? 0;
  const dot = DIETARY_DOT[item.dietaryType];
  const dietLabel = DIETARY_LABEL[item.dietaryType];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ ...springSnappy, delay: index * 0.03 }}
      className={cn(
        "group relative flex w-full overflow-hidden rounded-xl border border-[var(--guest-border)] bg-[var(--guest-surface)]",
        "shadow-[0_1px_2px_rgba(61,57,41,0.06)]",
        className,
      )}
    >
      {/* Ruled lines texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent,transparent 23px,rgba(218,217,212,0.5) 23px,rgba(218,217,212,0.5) 24px)",
          backgroundPosition: "0 12px",
        }}
        aria-hidden
      />

      {/* Left-side thumbnail */}
      {item.imageUrl && (
        <div className="relative h-auto w-24 shrink-0 overflow-hidden sm:w-28">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="112px"
          />
        </div>
      )}

      {/* Info — clickable */}
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        className="relative z-10 flex min-w-0 flex-1 flex-col items-start p-4 text-left"
      >
        {/* Badges */}
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {item.dietaryType !== "unknown" && (
            <span className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", dot)} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--guest-ink-muted)]">
                {dietLabel}
              </span>
            </span>
          )}
          {item.isSpecial && (
            <span
              className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: "#fff3e0", color: "#b05730", border: "1px solid #e8c9a0" }}
            >
              ⭐ Special
            </span>
          )}
          {item.isPopular && !item.isSpecial && (
            <span
              className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: "#fdf0ec", color: "#c96442", border: "1px solid #e8c4b4" }}
            >
              🔥 Popular
            </span>
          )}
        </div>

        <h3
          className={cn(
            "font-semibold leading-snug text-[var(--guest-ink)]",
            compact ? "text-sm" : "text-[15px]",
          )}
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {item.name}
        </h3>

        {item.description && !compact && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--guest-ink-muted)]">
            {item.description}
          </p>
        )}

        <p className="mt-2 text-sm font-bold text-[var(--guest-accent)]">
          {formatMenuPrice(item.priceCents, currency)}
        </p>
      </button>

      {/* Add / stepper */}
      <div className="relative z-10 flex shrink-0 items-end p-4 pt-0">
        {quantity > 0 ? (
          <div
            className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: "var(--guest-accent)" }}
          >
            <button
              type="button"
              onClick={() => updateQuantity(item.id, quantity - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/15"
              aria-label="Remove one"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-[1.25rem] text-center text-sm font-bold text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.id, quantity + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/15"
              aria-label="Add one"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            transition={springSnappy}
            onClick={() => addItem(item)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--guest-accent)" }}
            aria-label={`Add ${item.name}`}
          >
            <Plus className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
