"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, Droplets, Loader2, Minus, Plus, Receipt, Trash2 } from "lucide-react";
import React, { useRef, useState, useTransition } from "react";

import { GuestIdentityDialog, useIdentityDialog } from "@/components/guest/guest-identity-dialog";
import { useGuestCart } from "@/components/guest/guest-cart-provider";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { springGentle, springSnappy } from "@/lib/motion/presets";

/* ── Torn paper edge ─────────────────────────────────────────────────────── */
function TornEdge() {
  return (
    <svg
      viewBox="0 0 400 14"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className="block w-full shrink-0"
      style={{ height: 14, marginTop: -1 }}
      aria-hidden
    >
      <path
        d="M0,0 L0,14 L10,4 L20,12 L30,3 L40,11 L50,3 L60,12 L70,4 L80,11 L90,3 L100,12 L110,4 L120,11 L130,3 L140,12 L150,4 L160,11 L170,3 L180,12 L190,4 L200,11 L210,3 L220,12 L230,4 L240,11 L250,3 L260,12 L270,4 L280,11 L290,3 L300,12 L310,4 L320,11 L330,3 L340,12 L350,4 L360,11 L370,3 L380,12 L390,4 L400,11 L400,0 Z"
        style={{ fill: "var(--guest-header-bg)" }}
      />
      <path
        d="M0,14 L10,4 L20,12 L30,3 L40,11 L50,3 L60,12 L70,4 L80,11 L90,3 L100,12 L110,4 L120,11 L130,3 L140,12 L150,4 L160,11 L170,3 L180,12 L190,4 L200,11 L210,3 L220,12 L230,4 L240,11 L250,3 L260,12 L270,4 L280,11 L290,3 L300,12 L310,4 L320,11 L330,3 L340,12 L350,4 L360,11 L370,3 L380,12 L390,4 L400,11 L400,14 Z"
        fill="var(--guest-surface)"
      />
    </svg>
  );
}

/* ── Jagged tear line that draws across the sheet ────────────────────────── */
function TearLine({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-0 z-20"
          style={{ top: "40%" }}
        >
          <svg
            viewBox="0 0 400 20"
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: 20 }}
          >
            <motion.path
              d="M0,10 L18,3 L32,16 L48,2 L65,14 L80,4 L96,15 L112,3 L128,13 L145,2 L160,14 L176,3 L192,15 L208,2 L224,13 L240,3 L256,15 L272,2 L288,14 L304,3 L320,15 L336,2 L352,14 L368,3 L384,15 L400,6"
              fill="none"
              stroke="var(--guest-header-bg)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            />
            {/* Shadow / depth */}
            <motion.path
              d="M0,10 L18,3 L32,16 L48,2 L65,14 L80,4 L96,15 L112,3 L128,13 L145,2 L160,14 L176,3 L192,15 L208,2 L224,13 L240,3 L256,15 L272,2 L288,14 L304,3 L320,15 L336,2 L352,14 L368,3 L384,15 L400,6"
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Success overlay that replaces the cart after tear ───────────────────── */
function SuccessOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-t-3xl"
          style={{ background: "var(--guest-header-bg)" }}
        >
          {/* Subtle ruled lines on the dark surface */}
          <div
            className="pointer-events-none absolute inset-0 rounded-t-3xl opacity-[0.06]"
            style={{
              backgroundImage: "repeating-linear-gradient(transparent,transparent 23px,rgba(250,249,245,1) 23px,rgba(250,249,245,1) 24px)",
            }}
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 20 }}
            className="relative flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(201,100,66,0.15)", border: "1.5px solid rgba(201,100,66,0.4)" }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: "#c96442" }} strokeWidth={1.5} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <p
              className="text-2xl font-black"
              style={{ color: "var(--guest-header-ink)", fontFamily: "Georgia, serif" }}
            >
              Parcha sent ✂️
            </p>
            <p className="mt-1 text-sm" style={{ color: "rgba(250,249,245,0.5)" }}>
              Your order is with the kitchen.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Animation phases ────────────────────────────────────────────────────── */
type SendPhase = "idle" | "shaking" | "tearing" | "flying" | "success";

export function GuestCartSheet({ currency }: { currency: string }) {
  const {
    lines,
    itemCount,
    tableLabel,
    cartOpen,
    setCartOpen,
    updateQuantity,
    removeItem,
    updateLineNotes,
    placeOrder,
    requestService,
    customerName,
    subtotalCents,
  } = useGuestCart();

  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SendPhase>("idle");
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [, startPlace] = useTransition();
  const chitRef = useRef<HTMLDivElement>(null);

  const { open: dialogOpen, requireIdentity, handleConfirm, handleClose } = useIdentityDialog();

  function formatPrice(cents: number) {
    const amount = cents / 100;
    return `₹${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
  }

  function handlePlaceOrder() {
    setError(null);
    requireIdentity(() => {
      // Phase 1 — shake (0ms)
      setPhase("shaking");

      // Phase 2 — tear line draws (320ms)
      setTimeout(() => setPhase("tearing"), 320);

      // Phase 3 — whole chit flies off (620ms)
      setTimeout(() => setPhase("flying"), 620);

      // Phase 4 — success overlay + actually place order (1000ms)
      setTimeout(() => {
        setPhase("success");
        startPlace(async () => {
          const result = await placeOrder(notes.trim() || undefined);
          if (result.error) {
            setError(result.error);
            setPhase("idle");
            return;
          }
          setNotes("");
          // Let success screen show for a beat, then close + switch tab
          setTimeout(() => {
            setPhase("idle");
            setCartOpen(false);
            window.dispatchEvent(new CustomEvent("parcha:order-placed"));
          }, 900);
        });
      }, 980);
    });
  }

  async function handleService(type: "waiter" | "water" | "bill") {
    setServiceMessage(null);
    const result = await requestService(type);
    if (result.error) { setServiceMessage(result.error); return; }
    setServiceMessage("Request sent — staff will be with you shortly.");
    setTimeout(() => setServiceMessage(null), 4000);
  }

  /* Chit animation variants */
  const chitVariants = {
    idle:    { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 },
    shaking: {
      x: [0, -7, 6, -5, 4, -3, 2, 0],
      y: [0, -1, 1, -1, 0],
      rotate: [0, -1, 1, -0.5, 0],
      scale: 1,
      opacity: 1,
      transition: { duration: 0.32, ease: [0.45, 0, 0.55, 1] as [number, number, number, number] },
    },
    tearing: {
      x: 0, y: 0, rotate: 0, scale: 1, opacity: 1,
      transition: { duration: 0 },
    },
    flying: {
      y: "-105%",
      rotate: 4,
      scale: 0.92,
      opacity: 0,
      x: 16,
      transition: { duration: 0.38, ease: [0.4, 0, 0.6, 1] as [number, number, number, number] },
    },
    success: { y: 0, rotate: 0, scale: 1, opacity: 1, x: 0 },
  };

  return (
    <>
      <Sheet open={cartOpen} onOpenChange={(open) => {
        if (!open && phase !== "idle") return; // block closing during animation
        setCartOpen(open);
      }}>
        <SheetContent
          side="bottom"
          hideClose
          className="overflow-hidden border-0 p-0"
          style={{
            maxHeight: "92dvh",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Outer wrapper — relative for overlay positioning */}
          <div
            className="relative overflow-hidden rounded-t-3xl shadow-2xl"
            style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}
          >

            {/* ── The animated chit ── */}
            <motion.div
              ref={chitRef}
              className="flex min-h-0 flex-1 flex-col"
              style={{ background: "var(--guest-surface)", willChange: "transform" }}
              variants={chitVariants}
              animate={phase}
              initial="idle"
            >
              {/* Dark espresso header */}
              <div
                className="shrink-0 px-5 pt-5 pb-4"
                style={{ background: "var(--guest-header-bg)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle
                      className="text-lg font-bold"
                      style={{
                        color: "var(--guest-header-ink)",
                        fontFamily: "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      Your Parcha 📋
                    </SheetTitle>
                    <p className="mt-0.5 text-xs" style={{ color: "rgba(250,249,245,0.55)" }}>
                      {tableLabel ? `Table ${tableLabel}` : "Walk-in"}
                      {customerName && (
                        <span className="ml-1.5" style={{ color: "rgba(250,249,245,0.7)" }}>
                          · {customerName}
                        </span>
                      )}
                    </p>
                  </div>

                  {itemCount > 0 && (
                    <div
                      className="chit-stamp h-11 w-11 shrink-0 flex-col gap-0 text-[8px]"
                      style={{ borderColor: "#c96442", color: "#c96442", background: "rgba(201,100,66,0.12)" }}
                    >
                      <span className="text-base font-black leading-none" style={{ color: "var(--guest-header-ink)" }}>
                        {itemCount}
                      </span>
                      <span style={{ color: "rgba(250,249,245,0.5)" }}>ITEMS</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Torn paper SVG edge */}
              <TornEdge />

              {/* Tear line overlay — draws across during "tearing" phase */}
              <TearLine visible={phase === "tearing" || phase === "flying"} />

              {/* Scrollable paper body — flex-1 so footer CTA is always visible */}
              <div
                className="parcha-ruled min-h-0 flex-1 overflow-y-auto px-5 pb-2"
                style={{ backgroundPosition: "0 0", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
              >
                {lines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-3 text-5xl">📋</div>
                    <p className="font-bold text-[var(--guest-ink)]" style={{ fontFamily: "Georgia, serif" }}>
                      Your chit is empty
                    </p>
                    <p className="mt-1 text-sm text-[var(--guest-ink-muted)]">
                      Tap Add on any dish to start your order.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 py-3">
                    <AnimatePresence mode="popLayout">
                      {lines.map((line) => (
                        <motion.div
                          key={line.menuItemId}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                          transition={springGentle}
                          className="overflow-hidden rounded-xl border border-[var(--guest-border)] bg-[var(--guest-bg)]"
                        >
                          <div className="flex items-start gap-3 p-3.5">
                            <div className="min-w-0 flex-1">
                              <p
                                className="font-semibold leading-snug text-[var(--guest-ink)]"
                                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                              >
                                {line.name}
                              </p>
                              <p className="mt-0.5 text-xs font-semibold" style={{ color: "#c96442" }}>
                                {formatPrice(line.priceCents * line.quantity)}
                              </p>
                              <input
                                type="text"
                                value={line.notes ?? ""}
                                onChange={(e) => updateLineNotes(line.menuItemId, e.target.value)}
                                placeholder="e.g. less spicy, extra sauce"
                                style={{ fontSize: "16px" }}
                                className="mt-2 w-full rounded-lg border border-[var(--guest-border)] bg-[var(--guest-surface)] px-3 py-1.5 text-[var(--guest-ink)] outline-none placeholder:text-[var(--guest-ink-muted)]/50 focus:border-[var(--guest-accent)] transition-colors"
                              />
                            </div>

                            <div className="flex flex-col items-end gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => removeItem(line.menuItemId)}
                                className="text-[var(--guest-ink-muted)] transition-colors hover:text-destructive"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                              <div
                                className="flex items-center gap-0.5 rounded-xl p-0.5"
                                style={{ background: "var(--guest-accent)" }}
                              >
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(line.menuItemId, line.quantity - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
                                  aria-label="Decrease"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="min-w-[1.25rem] text-center text-sm font-bold text-white">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(line.menuItemId, line.quantity + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
                                  aria-label="Increase"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Service actions */}
                {tableLabel && (
                  <div className="mb-2 mt-4">
                    <div className="mb-2.5 flex items-center gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--guest-ink-muted)]">
                        Need help?
                      </p>
                      <div className="flex-1 border-t border-dashed border-[var(--guest-border)]" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: "waiter" as const, label: "Waiter", emoji: "🛎️" },
                        { type: "water" as const,  label: "Water",  emoji: "💧" },
                        { type: "bill"  as const,  label: "Bill",   emoji: "🧾" },
                      ].map((action) => (
                        <button
                          key={action.type}
                          type="button"
                          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--guest-border)] bg-[var(--guest-surface)] py-3.5 text-xs font-semibold text-[var(--guest-ink)] transition-colors active:bg-[var(--guest-border)]"
                          onClick={() => handleService(action.type)}
                        >
                          <span className="text-base">{action.emoji}</span>
                          {action.label}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence>
                      {serviceMessage && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-2.5 text-center text-xs text-[var(--guest-ink-muted)]"
                        >
                          {serviceMessage}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer CTA — shrink-0 so it never gets squeezed off screen */}
              {lines.length > 0 && (
                <div
                  className="shrink-0 space-y-3 border-t border-dashed border-[var(--guest-border)] px-5 pt-4"
                  style={{
                    background: "var(--guest-surface)",
                    paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
                  }}
                >
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special instructions for the kitchen…"
                    rows={2}
                    className="resize-none rounded-xl border-[var(--guest-border)] bg-[var(--guest-bg)] text-[var(--guest-ink)] placeholder:text-[var(--guest-ink-muted)]/50 focus-visible:ring-[var(--guest-accent)]/20"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--guest-ink-muted)]">
                      Total
                    </span>
                    <span className="text-lg font-black" style={{ color: "#c96442", fontFamily: "Georgia, serif" }}>
                      {formatPrice(subtotalCents)}
                    </span>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-sm text-destructive"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    disabled={phase !== "idle"}
                    onClick={handlePlaceOrder}
                    className="relative flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold tracking-wide text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-80"
                    style={{ background: "var(--guest-header-bg)" }}
                  >
                    <span style={{ fontFamily: "Georgia, serif" }}>
                      {phase === "shaking" ? "Tearing off… ✂️"
                        : phase === "tearing" || phase === "flying" ? "Sending…"
                        : "Send to kitchen"}
                    </span>
                    {phase === "idle" && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                    )}
                    {(phase === "tearing" || phase === "flying") && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </button>
                </div>
              )}
            </motion.div>

            {/* ── Success overlay — revealed after chit flies off ── */}
            <SuccessOverlay visible={phase === "success"} />
          </div>
        </SheetContent>
      </Sheet>

      <GuestIdentityDialog
        open={dialogOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </>
  );
}
