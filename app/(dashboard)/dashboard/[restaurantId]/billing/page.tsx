import { redirect } from "next/navigation";
import { Check, X, Zap } from "lucide-react";

import { getCurrentUser, getRestaurantById } from "@/services/restaurants.service";
import { getFeatures, PLAN_PRICING, PLAN_FEATURES } from "@/lib/features";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BillingPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) redirect("/dashboard");

  const features = getFeatures(restaurant);
  const currentPlan = (["menu", "starter", "pro"].includes(restaurant.plan)
    ? restaurant.plan
    : "starter") as "menu" | "starter" | "pro";

  const planInfo = PLAN_PRICING[currentPlan];
  const days = daysUntil(restaurant.plan_expires_at ?? null);
  const isExpiringSoon = days !== null && days <= 30;
  const isExpired = days !== null && days <= 0;

  const upgradePlans = (["menu", "starter", "pro"] as const).filter(
    (p) => PLAN_PRICING[p].price > planInfo.price,
  );

  const whatsappMsg = encodeURIComponent(
    `Hi! I'd like to upgrade my Parcha plan for "${restaurant.name}" (ID: ${restaurantId}) to a higher plan. Please help me with the upgrade.`,
  );
  const whatsappUrl = `https://wa.me/919999999999?text=${whatsappMsg}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your current plan and upgrade options.
        </p>
      </div>

      {/* Current plan card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                {planInfo.label}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isExpired
                    ? "bg-red-100 text-red-700"
                    : isExpiringSoon
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                {isExpired ? "Expired" : restaurant.status === "trial" ? "Trial" : "Active"}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              ₹{planInfo.price.toLocaleString("en-IN")}
              <span className="text-sm font-normal text-muted-foreground"> / year</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{planInfo.description}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plan expires</span>
            <span className="font-medium">{formatDate(restaurant.plan_expires_at ?? null)}</span>
          </div>
          {days !== null && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-muted-foreground">Days remaining</span>
              <span
                className={`font-semibold ${
                  isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-green-600"
                }`}
              >
                {isExpired ? "Expired" : `${days} days`}
              </span>
            </div>
          )}
        </div>

        {/* Features included */}
        <div>
          <p className="mb-3 text-sm font-medium">What&apos;s included</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLAN_FEATURES[currentPlan].map((f) => (
              <div key={f.text} className="flex items-center gap-2 text-sm">
                {f.included ? (
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
                <span className={f.included ? "" : "text-muted-foreground"}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Renew / expiry warning */}
      {(isExpired || isExpiringSoon) && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm ${
            isExpired
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <p className="font-semibold">
            {isExpired ? "Your plan has expired" : `Your plan expires in ${days} days`}
          </p>
          <p className="mt-0.5 opacity-80">
            Contact us on WhatsApp to renew and keep your café running smoothly.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Renew via WhatsApp
          </a>
        </div>
      )}

      {/* Upgrade options */}
      {upgradePlans.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Upgrade your plan</p>
          {upgradePlans.map((plan) => {
            const info = PLAN_PRICING[plan];
            const diff = info.price - planInfo.price;
            return (
              <div
                key={plan}
                className="rounded-2xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold">{info.label}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{info.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">₹{info.price.toLocaleString("en-IN")}<span className="text-xs font-normal text-muted-foreground">/yr</span></p>
                    <p className="text-xs text-muted-foreground">+₹{diff.toLocaleString("en-IN")} more</p>
                  </div>
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2">
                  {PLAN_FEATURES[plan]
                    .filter((f) => f.included && !PLAN_FEATURES[currentPlan].find((cf) => cf.text === f.text && cf.included))
                    .map((f) => (
                      <div key={f.text} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                        <span>{f.text}</span>
                      </div>
                    ))}
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Upgrade to {info.label} via WhatsApp
                </a>
              </div>
            );
          })}
        </div>
      )}

      {upgradePlans.length === 0 && (
        <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4 text-center text-sm text-muted-foreground">
          You&apos;re on the highest plan. 🎉
        </div>
      )}
    </div>
  );
}
