import { SettingsPanel } from "@/components/dashboard/settings-panel";
import { listRestaurantTables } from "@/services/tables.service";
import { getRestaurantById } from "@/services/restaurants.service";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const [restaurant, tables] = await Promise.all([
    getRestaurantById(restaurantId),
    listRestaurantTables(restaurantId),
  ]);

  if (!restaurant) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Manage your restaurant profile, tables, and QR ordering links.
        </p>
      </div>

      <SettingsPanel
        restaurantId={restaurantId}
        slug={restaurant.slug}
        restaurantName={restaurant.name}
        name={restaurant.name}
        description={restaurant.description}
        logoUrl={restaurant.logo_url}
        city={(restaurant as any).city ?? ""}
        smartSuggestionsEnabled={(restaurant as any).smart_suggestions_enabled ?? true}
        rewardsEnabled={(restaurant as any).rewards_enabled ?? false}
        orderingEnabled={(restaurant as any).ordering_enabled ?? true}
        plan={(restaurant as any).plan ?? "menu"}
        tables={tables ?? []}
      />
    </div>
  );
}
