"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";

import {
  createRestaurantAction,
  type AuthActionState,
} from "@/lib/actions/auth";
import { PLAN_PRICING, PLAN_FEATURES } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const PLANS = (["menu", "starter", "pro"] as const).map((key) => ({
  key,
  ...PLAN_PRICING[key],
  features: PLAN_FEATURES[key],
}));

export function CreateRestaurantForm() {
  const [state, formAction, isPending] = useActionState(
    createRestaurantAction,
    initialState,
  );
  const [selectedPlan, setSelectedPlan] = useState<"menu" | "starter" | "pro">("starter");

  return (
    <form action={formAction} className="space-y-7">
      {/* Plan picker */}
      <div className="space-y-3">
        <Label>Choose your plan</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <button
              key={plan.key}
              type="button"
              onClick={() => setSelectedPlan(plan.key)}
              className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                selectedPlan === plan.key
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              }`}
            >
              {selectedPlan === plan.key && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
              )}
              {plan.key === "starter" && (
                <span className="mb-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Most popular
                </span>
              )}
              <p className="font-semibold">{plan.label}</p>
              <p className="mt-0.5 text-lg font-bold">
                ₹{plan.price.toLocaleString("en-IN")}
                <span className="text-xs font-normal text-muted-foreground">/yr</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-snug">
                {plan.description}
              </p>
              <ul className="mt-3 space-y-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-1.5 text-xs">
                    <Check
                      className={`h-3 w-3 shrink-0 ${
                        f.included ? "text-green-500" : "text-muted-foreground/30"
                      }`}
                    />
                    <span className={f.included ? "" : "text-muted-foreground/50 line-through"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <input type="hidden" name="plan" value={selectedPlan} />
      </div>

      {/* Restaurant name */}
      <div className="space-y-2">
        <Label htmlFor="name">Café name</Label>
        <Input
          id="name"
          name="name"
          placeholder="The Coffee House"
          required
          onChange={(e) => {
            const slugInput = document.getElementById("slug") as HTMLInputElement | null;
            if (slugInput && !slugInput.dataset.touched) {
              slugInput.value = slugify(e.target.value);
            }
          }}
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Public URL</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="shrink-0 text-sm text-muted-foreground">parcha.app/r/</span>
          <Input
            id="slug"
            name="slug"
            placeholder="the-coffee-house"
            required
            onInput={(e) => {
              (e.target as HTMLInputElement).dataset.touched = "true";
            }}
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating…" : `Create café on ${PLAN_PRICING[selectedPlan].label} plan`}
      </Button>
    </form>
  );
}
