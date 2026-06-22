import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <AnalyticsDashboard restaurantId={restaurantId} />
    </div>
  );
}
