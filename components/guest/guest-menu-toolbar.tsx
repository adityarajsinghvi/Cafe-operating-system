"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { resolveGuestBrandColor } from "@/lib/guest/brand-color";

export function GuestMenuToolbar({
  query,
  onQueryChange,
  categories,
  activeCategory,
  onCategoryChange,
  primaryColor,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  categories: { id: string; name: string }[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  primaryColor?: string;
}) {
  const brandColor = resolveGuestBrandColor(primaryColor);

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-border/50 bg-[var(--guest-toolbar,theme(colors.card/0.92))] px-4 py-3 backdrop-blur-xl">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="guest-menu-search-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search dishes..."
            className="h-11 w-full rounded-xl border border-border/60 bg-muted/35 pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-border focus:bg-card"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {categories.length > 0 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => onCategoryChange("all")}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                activeCategory === "all"
                  ? "text-[var(--guest-accent-foreground)] shadow-sm"
                  : "border border-border/40 bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-[var(--guest-ink)]",
              )}
              style={
                activeCategory === "all"
                  ? { backgroundColor: brandColor }
                  : undefined
              }
            >
              All
            </button>
            {categories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onCategoryChange(category.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "text-[var(--guest-accent-foreground)] shadow-sm"
                      : "border border-border/40 bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-[var(--guest-ink)]",
                  )}
                  style={
                    isActive
                      ? { backgroundColor: brandColor }
                      : undefined
                  }
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
