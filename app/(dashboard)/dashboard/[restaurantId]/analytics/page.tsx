import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { getFeatures } from "@/lib/features";
import { getRestaurantById } from "@/services/restaurants.service";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const restaurant = await getRestaurantById(restaurantId);
  const features = restaurant ? getFeatures(restaurant) : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <AnalyticsDashboard
        restaurantId={restaurantId}
        showAiInsights={features?.aiInsights ?? false}
        showFullAnalytics={features?.fullAnalytics ?? false}
      />
    </div>
  );
}
