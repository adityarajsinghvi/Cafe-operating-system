"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

interface Suggestion {
  emoji: string;
  headline: string;
  itemName: string;
  reason: string;
  isPersonalized: boolean;
}

interface WeatherInfo {
  label: string;
  condition: string;
  tempC: number;
}

interface Props {
  onSuggestItem?: (itemName: string) => void;
}

export function SmartSuggestionBanner({ onSuggestItem }: Props) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/guest/suggestion")
      .then((r) => r.json())
      .then((d) => {
        setSuggestion(d.suggestion ?? null);
        setWeather(d.weather ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !suggestion || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-4 mb-3 overflow-hidden rounded-2xl border border-[oklch(0.62_0.17_55/0.25)] bg-[oklch(0.97_0.03_50)] px-4 py-3.5"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.97 0.04 55 / 0.9) 0%, oklch(0.95 0.06 48 / 0.85) 100%)",
          boxShadow: "0 2px 12px oklch(0.62 0.17 55 / 0.1)",
        }}
      >
        {/* Subtle shimmer overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse at 80% 50%, oklch(0.75 0.15 55 / 0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative flex items-start gap-3">
          {/* Emoji */}
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: "oklch(0.62 0.17 55 / 0.15)" }}
          >
            {suggestion.emoji}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                {/* Headline */}
                <p className="text-sm font-semibold leading-snug text-[oklch(0.28_0.08_48)]">
                  {suggestion.headline}
                </p>
                {/* Weather context */}
                {weather && (
                  <p className="mt-0.5 text-[11px] font-medium text-[oklch(0.50_0.08_50)]">
                    {weather.label}
                  </p>
                )}
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="shrink-0 rounded-lg p-1 text-[oklch(0.50_0.08_50)] transition-colors hover:bg-[oklch(0.62_0.17_55/0.12)] hover:text-[oklch(0.28_0.08_48)]"
                aria-label="Dismiss suggestion"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Reason */}
            <p className="mt-1 text-xs leading-relaxed text-[oklch(0.40_0.07_50)]">
              {suggestion.reason}
            </p>

            {/* CTA */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={() => {
                  onSuggestItem?.(suggestion.itemName);
                  setDismissed(true);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: "oklch(0.38 0.12 48)",
                  color: "oklch(0.97 0.03 50)",
                }}
              >
                <Sparkles className="h-3 w-3" />
                Try {suggestion.itemName}
              </button>

              {suggestion.isPersonalized && (
                <span className="flex items-center gap-1 rounded-full bg-[oklch(0.62_0.17_55/0.18)] px-2 py-0.5 text-[10px] font-medium text-[oklch(0.42_0.10_50)]">
                  ✦ Just for you
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
