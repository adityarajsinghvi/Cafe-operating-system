"use client";

import type { ReactNode } from "react";

import { GuestCartProvider } from "@/components/guest/guest-cart-provider";
import { GuestCartSheet } from "@/components/guest/guest-cart-sheet";
import { GuestLightTheme } from "@/components/guest/guest-light-theme";
import {
  GuestPendingOrderBar,
  GuestTableUrlSync,
} from "@/components/guest/guest-pending-order-bar";
import { GuestShell } from "@/components/guest/guest-shell";

export function GuestProviders({
  slug,
  restaurantId,
  currency,
  tableToken,
  primaryColor,
  orderingEnabled = true,
  serviceRequestsEnabled = false,
  smartSuggestionsEnabled = false,
  loyaltyEnabled = false,
  children,
}: {
  slug: string;
  restaurantId: string;
  currency: string;
  tableToken?: string;
  primaryColor?: string;
  orderingEnabled?: boolean;
  serviceRequestsEnabled?: boolean;
  smartSuggestionsEnabled?: boolean;
  loyaltyEnabled?: boolean;
  children: ReactNode;
}) {
  return (
    <GuestLightTheme>
      <GuestCartProvider
        restaurantId={restaurantId}
        slug={slug}
        tableToken={tableToken}
        orderingEnabled={orderingEnabled}
        serviceRequestsEnabled={serviceRequestsEnabled}
        loyaltyEnabled={loyaltyEnabled}
      >
        <GuestShell slug={slug} primaryColor={primaryColor}>
          <GuestTableUrlSync slug={slug} tableToken={tableToken} />
          {children}
          <GuestPendingOrderBar currency={currency} />
          <GuestCartSheet currency={currency} />
        </GuestShell>
      </GuestCartProvider>
    </GuestLightTheme>
  );
}
