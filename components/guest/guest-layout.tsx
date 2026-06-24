import type { ReactNode } from "react";

import { GuestProviders } from "@/components/guest/guest-providers";

export function GuestRestaurantLayout({
  slug,
  restaurantId,
  currency,
  tableToken,
  primaryColor,
  orderingEnabled,
  upiId,
  serviceRequestsEnabled,
  smartSuggestionsEnabled,
  loyaltyEnabled,
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
    <GuestProviders
      slug={slug}
      restaurantId={restaurantId}
      currency={currency}
      tableToken={tableToken}
      primaryColor={primaryColor}
      orderingEnabled={orderingEnabled}
      upiId={upiId}
      serviceRequestsEnabled={serviceRequestsEnabled}
      smartSuggestionsEnabled={smartSuggestionsEnabled}
      loyaltyEnabled={loyaltyEnabled}
    >
      {children}
    </GuestProviders>
  );
}
