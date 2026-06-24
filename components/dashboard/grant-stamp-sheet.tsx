"use client";

import { useRef, useState } from "react";
import { Check, Gift, Loader2, Phone, Star, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StampResult {
  customer: { id: string; name: string | null; phone: string; points: number; visits: number };
  threshold: number;
  rewardTitle: string;
  readyToRedeem: boolean;
  isNewCustomer: boolean;
}

function StampCircles({ filled, total }: { filled: number; total: number }) {
  const display = Math.min(total, 12);
  const filledCount = Math.min(filled, display);
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {Array.from({ length: display }).map((_, i) => (
        <div
          key={i}
          className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
            i < filledCount
              ? "border-amber-500 bg-amber-500"
              : "border-border bg-muted/30"
          }`}
        >
          {i < filledCount && <Star className="h-4 w-4 text-white fill-white" />}
        </div>
      ))}
    </div>
  );
}

export function GrantStampSheet({ restaurantId }: { restaurantId: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"input" | "granting" | "success">("input");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [nameLocked, setNameLocked] = useState(false); // true if returning customer
  const [lookingUp, setLookingUp] = useState(false);
  const [result, setResult] = useState<StampResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPhase("input");
    setPhone("");
    setName("");
    setNameLocked(false);
    setResult(null);
    setError(null);
  }

  function handleOpen() {
    reset();
    setOpen(true);
    setTimeout(() => phoneRef.current?.focus(), 80);
  }

  async function handlePhoneBlur() {
    if (!/^[6-9]\d{9}$/.test(phone)) return;
    setLookingUp(true);
    try {
      const res = await fetch(
        `/api/v1/dashboard/${restaurantId}/stamps?phone=${phone}`,
      );
      const data = await res.json();
      if (data.customer) {
        setName(data.customer.name ?? "");
        setNameLocked(Boolean(data.customer.name));
      }
    } catch {
      // ignore lookup errors
    } finally {
      setLookingUp(false);
    }
  }

  async function handleGrant() {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    setError(null);
    setPhase("granting");
    try {
      const res = await fetch(`/api/v1/dashboard/${restaurantId}/stamps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to grant stamp.");
        setPhase("input");
        return;
      }
      setResult(data as StampResult);
      setPhase("success");
    } catch {
      setError("Network error — please try again.");
      setPhase("input");
    }
  }

  async function handleRedeem() {
    if (!result) return;
    const res = await fetch(
      `/api/v1/dashboard/${restaurantId}/rewards/redeem`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: result.customer.id }),
      },
    );
    if (res.ok) {
      const data = await res.json();
      setResult((prev) =>
        prev
          ? {
              ...prev,
              customer: { ...prev.customer, points: data.remainingPoints ?? 0 },
              readyToRedeem: false,
            }
          : prev,
      );
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-3 rounded-2xl py-5 text-white text-lg font-bold shadow-lg active:scale-[0.98] transition-transform"
        style={{ background: "linear-gradient(135deg, #c96442 0%, #a84f32 100%)" }}
      >
        <Star className="h-6 w-6 fill-white" />
        Grant Stamp
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => { setOpen(false); reset(); }}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl border border-border bg-card shadow-2xl">
        <div className="px-5 pb-8 pt-5">
          {/* Handle + close */}
          <div className="mb-4 flex items-center justify-between">
            <div className="h-1 w-10 rounded-full bg-border" />
            <button
              type="button"
              onClick={() => { setOpen(false); reset(); }}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {phase === "input" || phase === "granting" ? (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                  <Star className="h-7 w-7 text-amber-600 fill-amber-600" />
                </div>
                <h2 className="text-xl font-bold">Grant Stamp</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter customer's phone number to add a stamp.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stamp-phone">Phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={phoneRef}
                    id="stamp-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onBlur={handlePhoneBlur}
                    className="pl-9"
                    disabled={phase === "granting"}
                  />
                  {lookingUp && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stamp-name">
                  Name
                  {nameLocked && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (returning customer)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="stamp-name"
                    placeholder="Customer name (optional)"
                    value={name}
                    onChange={(e) => !nameLocked && setName(e.target.value)}
                    className="pl-9"
                    readOnly={nameLocked}
                    disabled={phase === "granting"}
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                onClick={handleGrant}
                disabled={phase === "granting" || phone.length < 10}
                className="w-full h-12 text-base font-semibold"
              >
                {phase === "granting" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Granting…</>
                ) : (
                  "Grant Stamp"
                )}
              </Button>
            </div>
          ) : (
            /* Success state */
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
                  <Check className="h-7 w-7 text-green-600" />
                </div>
                <h2 className="text-xl font-bold">
                  {result?.isNewCustomer ? "Welcome!" : "Stamp granted!"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result?.customer.name
                    ? `${result.customer.name} · +91 ${result.customer.phone}`
                    : `+91 ${result?.customer.phone}`}
                </p>
              </div>

              {result && (
                <>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
                      {result.customer.points} / {result.threshold} stamps
                    </p>
                    <StampCircles
                      filled={result.customer.points}
                      total={result.threshold}
                    />
                  </div>

                  {result.readyToRedeem && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                      <Gift className="mx-auto mb-2 h-6 w-6 text-amber-600" />
                      <p className="font-semibold text-amber-800">
                        Reward unlocked: {result.rewardTitle}
                      </p>
                      <p className="mt-0.5 text-sm text-amber-700">
                        Tap below to redeem now and reset their stamps.
                      </p>
                      <Button
                        onClick={handleRedeem}
                        className="mt-3 w-full"
                        style={{ background: "#d97706" }}
                      >
                        Redeem Reward
                      </Button>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setOpen(false); reset(); }}
                >
                  Done
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => { reset(); setTimeout(() => phoneRef.current?.focus(), 80); }}
                >
                  Another customer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
