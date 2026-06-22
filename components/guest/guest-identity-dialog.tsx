"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { useGuestCart } from "@/components/guest/guest-cart-provider";
import { springGentle } from "@/lib/motion/presets";

function isValidIndianPhone(phone: string) {
  return /^[6-9]\d{9}$/.test(phone);
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (identity: { phone: string; name: string }) => void;
}

export function GuestIdentityDialog({ open, onClose, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
      setError(null);
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [open]);

  function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("Please enter your name");
      return;
    }
    if (!isValidIndianPhone(trimmedPhone)) {
      setError("Enter a valid 10-digit mobile number starting with 6–9");
      return;
    }

    startTransition(async () => {
      await onConfirm({ phone: trimmedPhone, name: trimmedName });
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={springGentle}
            className="fixed inset-x-4 z-50 mx-auto max-w-sm overflow-hidden rounded-3xl bg-[var(--guest-surface)] shadow-2xl shadow-black/20 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
            style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            role="dialog"
            aria-modal="true"
            aria-label="Enter your details"
          >
            {/* Dark espresso header band */}
            <div
              className="relative px-6 pb-5 pt-7"
              style={{ background: "var(--guest-header-bg)" }}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ background: "rgba(250,249,245,0.12)", color: "rgba(250,249,245,0.6)" }}
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Icon */}
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm"
                style={{ background: "rgba(250,249,245,0.12)" }}>
                ✨
              </div>

              <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--guest-header-ink)", fontFamily: "Georgia, serif" }}>
                Tell us who you are
              </h2>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "rgba(250,249,245,0.6)" }}>
                We&apos;ll remember your favourites and personalise every visit.
              </p>
            </div>

            {/* Torn paper SVG edge */}
            <svg viewBox="0 0 400 10" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
              className="block w-full" style={{ height: 10, marginTop: -1 }} aria-hidden>
              <path d="M0,0 L0,10 L10,3 L20,9 L30,2 L40,8 L50,2 L60,9 L70,3 L80,8 L90,2 L100,9 L110,3 L120,8 L130,2 L140,9 L150,3 L160,8 L170,2 L180,9 L190,3 L200,8 L210,2 L220,9 L230,3 L240,8 L250,2 L260,9 L270,3 L280,8 L290,2 L300,9 L310,3 L320,8 L330,2 L340,9 L350,3 L360,8 L370,2 L380,9 L390,3 L400,8 L400,0 Z"
                style={{ fill: "var(--guest-header-bg)" }} />
              <path d="M0,10 L10,3 L20,9 L30,2 L40,8 L50,2 L60,9 L70,3 L80,8 L90,2 L100,9 L110,3 L120,8 L130,2 L140,9 L150,3 L160,8 L170,2 L180,9 L190,3 L200,8 L210,2 L220,9 L230,3 L240,8 L250,2 L260,9 L270,3 L280,8 L290,2 L300,9 L310,3 L320,8 L330,2 L340,9 L350,3 L360,8 L370,2 L380,9 L390,3 L400,8 L400,10 Z"
                fill="var(--guest-surface)" />
            </svg>

            {/* Fields */}
            <div className="space-y-3 px-6 pb-2 pt-4">
              <div>
                <label
                  htmlFor="identity-name"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-[var(--guest-ink-muted)]"
                >
                  Your name
                </label>
                <input
                  ref={nameRef}
                  id="identity-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="e.g. Priya"
                  autoComplete="given-name"
                  style={{ fontSize: "16px" }}
                  className="w-full rounded-2xl border border-[var(--guest-border)] bg-[var(--guest-bg)] px-4 py-3 text-[var(--guest-ink)] outline-none placeholder:text-[var(--guest-ink-muted)]/50 transition-all focus:border-[var(--guest-accent)] focus:ring-2 focus:ring-[var(--guest-accent)]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="identity-phone"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-[var(--guest-ink-muted)]"
                >
                  Mobile number
                </label>
                <div className="flex gap-2">
                  <span className="flex items-center rounded-2xl border border-[var(--guest-border)] bg-[var(--guest-bg)] px-3.5 py-3 text-sm font-semibold text-[var(--guest-ink-muted)]">
                    +91
                  </span>
                  <input
                    id="identity-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    style={{ fontSize: "16px" }}
                    className="w-full rounded-2xl border border-[var(--guest-border)] bg-[var(--guest-bg)] px-4 py-3 text-[var(--guest-ink)] outline-none placeholder:text-[var(--guest-ink-muted)]/50 transition-all focus:border-[var(--guest-accent)] focus:ring-2 focus:ring-[var(--guest-accent)]/15"
                  />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-xs text-[var(--destructive)]"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="space-y-2 px-6 pb-6 pt-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isPending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--guest-accent)] text-sm font-bold tracking-wide text-[var(--guest-accent-foreground)] shadow-lg shadow-[var(--guest-accent)]/20 transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save & continue →"
                )}
              </motion.button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-1.5 text-center text-xs text-[var(--guest-ink-muted)] transition-colors hover:text-[var(--guest-ink)]"
              >
                Skip this step
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Standalone trigger hook for cart sheet ────────────────────────────── */
export function useIdentityDialog() {
  const { customerPhone, saveIdentity } = useGuestCart();
  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  function requireIdentity(onComplete: () => void) {
    if (customerPhone) {
      onComplete();
      return;
    }
    pendingActionRef.current = onComplete;
    setOpen(true);
  }

  async function handleConfirm(identity: { phone: string; name: string }) {
    await saveIdentity(identity.phone, identity.name);
    setOpen(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }

  function handleClose() {
    setOpen(false);
    // Skip — run the action anyway (phone stays unknown)
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }

  return { open, requireIdentity, handleConfirm, handleClose };
}
