"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Sparkles, Star } from "lucide-react";

import { DietaryBadge } from "@/components/onboarding/dietary-badge";
import { useGuestCart } from "@/components/guest/guest-cart-provider";
import { springSnappy } from "@/lib/motion/presets";
import type { GuestMenuItem } from "@/types/guest";
import { formatMenuPrice } from "@/types/guest";

export function FeaturedItemCard({
  item,
  currency,
  accent = "special",
  primaryColor,
  onSelect,
}: {
  item: GuestMenuItem;
  currency: string;
  accent?: "special" | "popular" | "menu";
  primaryColor?: string;
  onSelect: (item: GuestMenuItem) => void;
}) {
  const { addItem } = useGuestCart();

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      transition={springSnappy}
      className="group relative flex h-[196px] w-[min(68vw,220px)] shrink-0 snap-center flex-col overflow-hidden rounded-2xl shadow-[0_4px_16px_rgba(61,57,41,0.14)]"
    >
      {/* Full-card tap */}
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="absolute inset-0 z-0"
        aria-label={`View ${item.name}`}
      />

      {/* Background */}
      {item.imageUrl ? (
        <div className="absolute inset-0">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="220px"
          />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(145deg, #e8c4a8 0%, #c96442 100%)" }}
        />
      )}

      {/* Scrim */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(28,20,12,0.88) 0%, rgba(28,20,12,0.3) 50%, transparent 75%)",
        }}
      />

      {/* Badge — top left */}
      {accent !== "menu" && (
        <div className="absolute left-3 top-3 z-10">
          {accent === "special" ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-amber-400/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
              <Sparkles className="h-2.5 w-2.5" />
              Special
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-sm bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm" style={{ color: "#c96442" }}>
              <Star className="h-2.5 w-2.5" />
              Popular
            </span>
          )}
        </div>
      )}

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <DietaryBadge type={item.dietaryType} hideUnknown />
            <h3
              className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-white"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {item.name}
            </h3>
            <p className="mt-1 text-sm font-bold" style={{ color: "#f5c08a" }}>
              {formatMenuPrice(item.priceCents, currency)}
            </p>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={springSnappy}
            onClick={(e) => { e.stopPropagation(); addItem(item); }}
            className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-md transition-opacity hover:opacity-90"
            aria-label={`Add ${item.name}`}
          >
            <Plus className="h-4 w-4" style={{ color: "#c96442" }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
