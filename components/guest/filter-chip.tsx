"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion/presets";

export function FilterChip({
  label,
  active,
  onClick,
  layoutId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  layoutId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active ? "text-[var(--guest-accent-foreground)]" : "text-muted-foreground hover:text-[var(--guest-ink)]",
      )}
    >
      {active && layoutId && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-[var(--guest-accent)] shadow-md shadow-[color-mix(in_oklch,var(--guest-accent)_25%,transparent)]"
          transition={springSnappy}
        />
      )}
      {active && !layoutId && (
        <span className="absolute inset-0 rounded-full bg-[var(--guest-accent)] shadow-md shadow-[color-mix(in_oklch,var(--guest-accent)_25%,transparent)]" />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
