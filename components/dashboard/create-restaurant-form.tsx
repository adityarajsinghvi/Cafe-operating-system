"use client";

import { useActionState } from "react";

import {
  createRestaurantAction,
  type AuthActionState,
} from "@/lib/actions/auth";
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

export function CreateRestaurantForm() {
  const [state, formAction, isPending] = useActionState(
    createRestaurantAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Restaurant name</Label>
        <Input
          id="name"
          name="name"
          placeholder="The Spice Room"
          required
          onChange={(e) => {
            const slugInput = document.getElementById(
              "slug",
            ) as HTMLInputElement | null;
            if (slugInput && !slugInput.dataset.touched) {
              slugInput.value = slugify(e.target.value);
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Public URL slug</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="shrink-0 text-sm text-muted-foreground">
            parcha.app/r/
          </span>
          <Input
            id="slug"
            name="slug"
            placeholder="the-spice-room"
            required
            onInput={(e) => {
              (e.target as HTMLInputElement).dataset.touched = "true";
            }}
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create restaurant"}
      </Button>
    </form>
  );
}
