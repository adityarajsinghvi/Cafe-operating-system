import type { ReactNode } from "react";

import { GuestProviders } from "@/components/guest/guest-providers";

export function GuestRestaurantLayout({
  slug,
  restaurantId,
  currency,
  tableToken,
  primaryColor,
  orderingEnabled,
  children,
}: {
  slug: string;
  restaurantId: string;
  currency: string;
  tableToken?: string;
  primaryColor?: string;
  orderingEnabled?: boolean;
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
    >
      {children}
    </GuestProviders>
  );
}
