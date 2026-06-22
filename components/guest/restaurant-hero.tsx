"use client";

import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";

import { ParchaWordmark } from "@/components/shared/parcha-logo";
import type { GuestMenu } from "@/types/guest";

export function RestaurantHero({
  restaurant,
  itemCount,
  categoryCount,
}: {
  restaurant: GuestMenu["restaurant"];
  itemCount: number;
  categoryCount: number;
}) {
  return (
    <div className="relative">
      {/* ── Dark espresso header ── */}
      <div
        className="relative overflow-hidden px-5 pb-5 pt-8 sm:px-6"
        style={{ background: "var(--guest-header-bg)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-4"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl"
            style={{
              background: restaurant.logoUrl ? "#fff" : "var(--guest-accent)",
              boxShadow: "0 6px 24px rgba(201,100,66,0.35)",
            }}
          >
            {restaurant.logoUrl ? (
              <Image
                src={restaurant.logoUrl}
                alt={restaurant.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-xl font-bold text-white"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {restaurant.name.charAt(0)}
              </div>
            )}
          </motion.div>

          <div className="min-w-0 flex-1">
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="truncate text-xl font-bold tracking-tight"
              style={{
                color: "var(--guest-header-ink)",
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}
            >
              {restaurant.name}
            </motion.h1>

            {restaurant.description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18 }}
                className="mt-0.5 line-clamp-1 text-xs"
                style={{ color: "rgba(250,249,245,0.55)" }}
              >
                {restaurant.description}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Parcha branding — top-right corner */}
        <div className="absolute right-4 top-4 sm:right-5 opacity-60">
          <ParchaWordmark variant="light" height={16} />
        </div>

        {/* Metadata chips */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: "rgba(250,249,245,0.1)",
              color: "rgba(250,249,245,0.65)",
              border: "1px solid rgba(250,249,245,0.12)",
            }}
          >
            <UtensilsCrossed className="h-3 w-3" /> {itemCount} dishes · {categoryCount} categories
          </span>
        </motion.div>
      </div>

      {/* ── Torn paper edge ── */}
      <svg
        viewBox="0 0 400 16"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: 16, marginTop: -1 }}
        aria-hidden
      >
        <path
          d="M0,0 L0,16
             L8,4 L16,14 L24,3 L32,13 L40,2 L48,12 L56,3 L64,14
             L72,4 L80,13 L88,2 L96,12 L104,3 L112,14 L120,5 L128,13
             L136,2 L144,11 L152,4 L160,14 L168,3 L176,12 L184,4 L192,13
             L200,2 L208,12 L216,4 L224,14 L232,3 L240,11 L248,4 L256,13
             L264,2 L272,12 L280,5 L288,13 L296,3 L304,14 L312,4 L320,12
             L328,2 L336,13 L344,4 L352,14 L360,3 L368,12 L376,5 L384,13
             L392,3 L400,12 L400,0 Z"
          style={{ fill: "var(--guest-header-bg)" }}
        />
        <path
          d="M0,16 L8,4 L16,14 L24,3 L32,13 L40,2 L48,12 L56,3 L64,14
             L72,4 L80,13 L88,2 L96,12 L104,3 L112,14 L120,5 L128,13
             L136,2 L144,11 L152,4 L160,14 L168,3 L176,12 L184,4 L192,13
             L200,2 L208,12 L216,4 L224,14 L232,3 L240,11 L248,4 L256,13
             L264,2 L272,12 L280,5 L288,13 L296,3 L304,14 L312,4 L320,12
             L328,2 L336,13 L344,4 L352,14 L360,3 L368,12 L376,5 L384,13
             L392,3 L400,12 L400,16 Z"
          fill="#faf9f5"
        />
      </svg>
    </div>
  );
}
