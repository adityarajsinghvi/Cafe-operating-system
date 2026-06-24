"use client";

import type { ReactNode } from "react";

import { GuestCartProvider } from "@/components/guest/guest-cart-provider";
import { GuestCartSheet } from "@/components/guest/guest-cart-sheet";
import { GuestLightTheme } from "@/components/guest/guest-light-theme";
import { GuestOrderTracker } from "@/components/guest/guest-order-tracker";
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
  upiId = null,
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
  upiId?: string | null;
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
        upiId={upiId}
        serviceRequestsEnabled={serviceRequestsEnabled}
        loyaltyEnabled={loyaltyEnabled}
      >
        <GuestShell slug={slug} primaryColor={primaryColor}>
          <GuestTableUrlSync slug={slug} tableToken={tableToken} />
          {children}
          <GuestPendingOrderBar currency={currency} />
          <GuestCartSheet currency={currency} />
          <GuestOrderTracker currency={currency} primaryColor={primaryColor} />
        </GuestShell>
      </GuestCartProvider>
    </GuestLightTheme>
  );
}
