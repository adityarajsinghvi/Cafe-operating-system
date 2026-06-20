import type { ReactNode } from "react";

import { GuestProviders } from "@/components/guest/guest-providers";

export function GuestRestaurantLayout({
  slug,
  restaurantId,
  currency,
  tableToken,
  primaryColor,
  children,
}: {
  slug: string;
  restaurantId: string;
  currency: string;
  tableToken?: string;
  primaryColor?: string;
  children: ReactNode;
}) {
  return (
    <GuestProviders
      slug={slug}
      restaurantId={restaurantId}
      currency={currency}
      tableToken={tableToken}
      primaryColor={primaryColor}
    >
      {children}
    </GuestProviders>
  );
}
