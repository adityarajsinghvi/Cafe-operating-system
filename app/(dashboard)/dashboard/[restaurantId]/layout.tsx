import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getFeatures } from "@/lib/features";
import {
  claimRestaurantOwnership,
  getCurrentUser,
  getRestaurantById,
  getRestaurantMembership,
} from "@/services/restaurants.service";

export default async function RestaurantDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [restaurant, membership] = await Promise.all([
    getRestaurantById(restaurantId),
    getRestaurantMembership(restaurantId, user.id),
  ]);

  if (!restaurant || !membership) {
    const claimed = await claimRestaurantOwnership(restaurantId);
    if (claimed) {
      redirect(`/dashboard/${restaurantId}`);
    }

    redirect(
      `/dashboard?error=restaurant_not_accessible&restaurantId=${restaurantId}`,
    );
  }

  const features = getFeatures(restaurant);

  return (
    <DashboardShell
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      features={features}
    >
      {children}
    </DashboardShell>
  );
}
