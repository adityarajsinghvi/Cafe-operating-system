import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateRestaurantForm } from "@/components/dashboard/create-restaurant-form";
import {
  claimRestaurantOwnership,
  getCurrentUser,
  getUserRestaurants,
  isAdminClientConfigured,
} from "@/services/restaurants.service";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; restaurantId?: string }>;
}) {
  const { error, restaurantId } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (error === "restaurant_not_accessible" && restaurantId) {
    const claimed = await claimRestaurantOwnership(restaurantId);
    if (claimed) {
      redirect(`/dashboard/${restaurantId}`);
    }
  }

  const restaurants = await getUserRestaurants();

  if (restaurants.length === 1) {
    redirect(`/dashboard/${restaurants[0].id}`);
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-6 space-y-2 text-center sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {restaurants.length > 0 ? "Your restaurants" : "Create your restaurant"}
        </h1>
        <p className="text-muted-foreground">
          {restaurants.length > 0
            ? "Select a restaurant or create another one."
            : "Set up your restaurant to start onboarding your menu."}
        </p>
        {error === "restaurant_not_accessible" && (
          <p className="text-sm text-destructive">
            {!isAdminClientConfigured()
              ? "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings → API), restart the dev server, then reload this page."
              : "That restaurant exists but your account is not linked to it yet. Reload to retry, or create a new restaurant below."}
          </p>
        )}
      </div>

      {restaurants.length > 0 && (
        <div className="mb-8 grid gap-3">
          {restaurants.map((restaurant) => (
            <a
              key={restaurant.id}
              href={`/dashboard/${restaurant.id}`}
              className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-md"
            >
              <p className="font-medium">{restaurant.name}</p>
              <p className="text-sm text-muted-foreground">/{restaurant.slug}</p>
            </a>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>New restaurant</CardTitle>
          <CardDescription>
            You&apos;ll be the owner and can invite staff later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateRestaurantForm />
        </CardContent>
      </Card>
    </div>
  );
}
