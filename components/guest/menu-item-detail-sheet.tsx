"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import { useGuestCart } from "@/components/guest/guest-cart-provider";
import { DietaryBadge } from "@/components/onboarding/dietary-badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { springGentle } from "@/lib/motion/presets";
import type { GuestMenuItem } from "@/types/guest";
import { formatMenuPrice } from "@/types/guest";

export function MenuItemDetailSheet({
  item,
  currency,
  open,
  onOpenChange,
}: {
  item: GuestMenuItem | null;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addItem } = useGuestCart();

  function handleAdd() {
    if (!item) return;
    addItem(item);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="max-h-[88dvh] overflow-hidden border-0 p-0"
      >
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={springGentle}
              className="flex max-h-[calc(88dvh-1rem)] flex-col"
            >
              <SheetTitle className="sr-only">{item.name}</SheetTitle>

              <div className="relative h-52 shrink-0 bg-muted sm:h-56">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-background text-6xl">
                    🍽️
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-[color-mix(in_oklch,var(--guest-accent)_8%,transparent)]" />
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/85 text-foreground shadow-lg backdrop-blur-md"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-8 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {item.name}
                  </h2>
                  <DietaryBadge type={item.dietaryType} />
                </div>

                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {formatMenuPrice(item.priceCents, currency)}
                </p>

                {(item.isSpecial || item.isPopular) && (
                  <div className="mt-4 flex gap-2">
                    {item.isSpecial && (
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                        Today&apos;s special
                      </span>
                    )}
                    {item.isPopular && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium">
                        Guest favourite
                      </span>
                    )}
                  </div>
                )}

                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  {item.description || "A delicious choice from the menu."}
                </p>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  transition={springGentle}
                  onClick={handleAdd}
                  className="mt-8 rounded-2xl bg-[var(--guest-accent)] px-4 py-4 text-sm font-semibold text-[var(--guest-accent-foreground)]"
                >
                  Add to order
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
