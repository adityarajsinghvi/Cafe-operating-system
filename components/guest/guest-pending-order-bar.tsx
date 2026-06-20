"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText } from "lucide-react";

import { useGuestCart } from "@/components/guest/guest-cart-provider";
import { springGentle, springSnappy } from "@/lib/motion/presets";

export function GuestTableUrlSync({
  slug,
  tableToken,
}: {
  slug: string;
  tableToken?: string;
}) {
  const router = useRouter();
  const { tableLabel, sessionReady } = useGuestCart();

  useEffect(() => {
    if (!sessionReady || !tableLabel || !tableToken) return;
    const params = new URLSearchParams();
    params.set("table", tableLabel);
    params.set("t", tableToken);
    router.replace(`/r/${slug}?${params.toString()}`, { scroll: false });
  }, [sessionReady, tableLabel, tableToken, slug, router]);

  return null;
}

/** Parcha scroll / chit FAB — appears when cart has items. */
export function GuestPendingOrderBar({ currency }: { currency: string }) {
  const { itemCount, cartOpen, setCartOpen } = useGuestCart();

  return (
    <AnimatePresence>
      {itemCount > 0 && !cartOpen && (
        <motion.button
          type="button"
          key="cart-fab"
          initial={{ opacity: 0, scale: 0.7, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 16 }}
          transition={springSnappy}
          whileTap={{ scale: 0.92 }}
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-4 z-40 flex h-14 items-center gap-2.5 rounded-2xl px-4 shadow-xl shadow-[rgba(61,57,41,0.3)] transition-opacity hover:opacity-90"
          style={{ background: "var(--guest-header-bg)" }}
          aria-label="View your chit"
        >
          {/* Small torn paper icon */}
          <div className="relative">
            <ScrollText className="h-5 w-5" style={{ color: "var(--guest-header-ink)" }} />
            {/* Pulse ring for urgency */}
            <motion.span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
              style={{ background: "#c96442" }}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            />
          </div>
          <span
            className="text-sm font-bold"
            style={{ color: "var(--guest-header-ink)", fontFamily: "Georgia, serif" }}
          >
            View chit
          </span>
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: "#c96442", color: "#fff" }}
          >
            {itemCount}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
