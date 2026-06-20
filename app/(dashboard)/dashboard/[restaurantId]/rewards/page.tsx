import { RewardsPanel } from "@/components/dashboard/rewards-panel";

export default async function RewardsPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <RewardsPanel restaurantId={restaurantId} />
    </div>
  );
}
