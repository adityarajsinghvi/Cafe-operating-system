import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuestRestaurantLayout } from "@/components/guest/guest-layout";
import { GuestMenuView } from "@/components/guest/guest-menu-view";
import { getGuestMenuBySlug } from "@/services/guest-menu.service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getGuestMenuBySlug(slug);

  if (!menu) {
    return { title: "Restaurant not found" };
  }

  return {
    title: `${menu.restaurant.name} — Menu`,
    description:
      menu.restaurant.description ??
      `Browse the menu at ${menu.restaurant.name}`,
  };
}

export default async function GuestRestaurantPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string; table?: string }>;
}) {
  const { slug } = await params;
  const { t: tableToken } = await searchParams;
  const menu = await getGuestMenuBySlug(slug);

  if (!menu) {
    notFound();
  }

  return (
    <GuestRestaurantLayout
      slug={slug}
      restaurantId={menu.restaurant.id}
      currency={menu.restaurant.currency}
      tableToken={tableToken}
      primaryColor={menu.restaurant.primaryColor}
    >
      <GuestMenuView menu={menu} />
    </GuestRestaurantLayout>
  );
}
