"use client";

import { useState } from "react";
import { Gift, Loader2, Phone, Star, X } from "lucide-react";

interface RewardsLookup {
  found: boolean;
  customer: {
    name: string | null;
    points: number;
    visits: number;
    redemptionsCount: number;
  } | null;
  threshold: number;
  pointsPerVisit: number;
  rewardTitle: string;
  rewardDescription: string | null;
}

function StampCircles({ filled, total }: { filled: number; total: number }) {
  const display = Math.min(total, 12);
  const filledCount = Math.min(filled, display);
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {Array.from({ length: display }).map((_, i) => (
        <div
          key={i}
          className={`h-8 w-8 rounded-full border-2 flex items-center justify-center`}
          style={{
            borderColor: i < filledCount ? "var(--guest-accent)" : "var(--guest-border)",
            background: i < filledCount ? "var(--guest-accent)" : "transparent",
          }}
        >
          {i < filledCount && <Star className="h-4 w-4 fill-white text-white" />}
        </div>
      ))}
    </div>
  );
}

export function GuestRewardsBanner({ restaurantId }: { restaurantId: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RewardsLookup | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/guest/rewards?restaurantId=${restaurantId}&phone=${phone}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not fetch rewards.");
        return;
      }
      setData(json as RewardsLookup);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setPhone("");
    setData(null);
    setError(null);
  }

  return (
    <>
      {/* Floating pill */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-4 z-30 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg active:scale-95 transition-transform"
          style={{ background: "var(--guest-header-bg)" }}
        >
          <Star className="h-4 w-4 fill-white" />
          My Stamps
        </button>
      )}

      {/* Sheet */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl border shadow-2xl"
            style={{
              background: "var(--guest-surface)",
              borderColor: "var(--guest-border)",
            }}
          >
            <div className="px-5 pb-8 pt-5">
              {/* Handle + close */}
              <div className="mb-5 flex items-center justify-between">
                <div className="h-1 w-10 rounded-full" style={{ background: "var(--guest-border)" }} />
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full p-1.5 transition-colors"
                  style={{ color: "var(--guest-ink-muted)" }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!data ? (
                /* Phone lookup */
                <div className="space-y-5">
                  <div className="text-center">
                    <div
                      className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ background: "rgba(201,100,66,0.12)" }}
                    >
                      <Star className="h-7 w-7 fill-current" style={{ color: "var(--guest-accent)" }} />
                    </div>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "var(--guest-ink)", fontFamily: "Georgia, serif" }}
                    >
                      Check your stamps
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: "var(--guest-ink-muted)" }}>
                      Enter your phone number to see your stamp card.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                        style={{ color: "var(--guest-ink-muted)" }}
                      />
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="Your 10-digit number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                        className="w-full rounded-xl border px-4 py-3 pl-10 text-sm outline-none focus:ring-2"
                        style={{
                          background: "var(--guest-surface)",
                          borderColor: "var(--guest-border)",
                          color: "var(--guest-ink)",
                        }}
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-red-600">{error}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={loading || phone.length < 10}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                    style={{ background: "var(--guest-header-bg)" }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                      </span>
                    ) : (
                      "Check stamps"
                    )}
                  </button>
                </div>
              ) : (
                /* Stamp card */
                <div className="space-y-5">
                  <div className="text-center">
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "var(--guest-ink)", fontFamily: "Georgia, serif" }}
                    >
                      {data.customer?.name ? `Hi, ${data.customer.name}!` : "Your stamp card"}
                    </h2>
                    {!data.found && (
                      <p className="mt-1 text-sm" style={{ color: "var(--guest-ink-muted)" }}>
                        No stamps yet — visit us and start collecting!
                      </p>
                    )}
                  </div>

                  {data.found && data.customer && (
                    <>
                      <div
                        className="rounded-2xl border p-4"
                        style={{ borderColor: "var(--guest-border)", background: "var(--guest-bg)" }}
                      >
                        <p
                          className="mb-3 text-center text-sm font-medium"
                          style={{ color: "var(--guest-ink-muted)" }}
                        >
                          {data.customer.points} / {data.threshold} stamps
                        </p>
                        <StampCircles filled={data.customer.points} total={data.threshold} />
                      </div>

                      {data.customer.points >= data.threshold ? (
                        <div
                          className="rounded-2xl border p-4 text-center"
                          style={{ borderColor: "#f59e0b", background: "#fffbeb" }}
                        >
                          <Gift className="mx-auto mb-2 h-6 w-6 text-amber-600" />
                          <p className="font-semibold text-amber-800">
                            You&apos;ve earned: {data.rewardTitle}
                          </p>
                          {data.rewardDescription && (
                            <p className="mt-0.5 text-sm text-amber-700">{data.rewardDescription}</p>
                          )}
                          <p className="mt-2 text-xs text-amber-600">
                            Show this to the owner to redeem your reward!
                          </p>
                        </div>
                      ) : (
                        <p
                          className="text-center text-sm"
                          style={{ color: "var(--guest-ink-muted)" }}
                        >
                          {data.threshold - data.customer.points} more stamp
                          {data.threshold - data.customer.points !== 1 ? "s" : ""} to earn{" "}
                          <span style={{ color: "var(--guest-ink)" }}>{data.rewardTitle}</span>
                        </p>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-xl border py-3 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: "var(--guest-border)",
                      color: "var(--guest-ink)",
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
