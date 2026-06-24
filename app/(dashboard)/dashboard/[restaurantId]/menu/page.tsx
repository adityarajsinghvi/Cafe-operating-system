import Link from "next/link";
import { ArrowRight, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRestaurantById } from "@/services/restaurants.service";
import { getPublishedMenuStats, getMenuCategoryOverview } from "@/services/menu.service";

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const { restaurantId } = await params;
  const { published } = await searchParams;
  const [restaurant, stats, categories] = await Promise.all([
    getRestaurantById(restaurantId),
    getPublishedMenuStats(restaurantId),
    getMenuCategoryOverview(restaurantId),
  ]);

  const hasMenu = (stats?.itemCount ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4" style={{ background: "#3d3929" }}>
          <h1
            className="text-xl font-black tracking-tight"
            style={{ color: "#faf9f5", fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Your Menu 📋
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(250,249,245,0.5)" }}>
            {hasMenu
              ? `${stats?.categoryCount} categories · ${stats?.itemCount} items published`
              : "Upload your printed menu — AI structures it instantly"}
          </p>
        </div>
        <div
          className="border-t border-dashed border-border px-5 py-2.5 text-xs text-muted-foreground"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent,transparent 23px,rgba(0,0,0,0.03) 23px,rgba(0,0,0,0.03) 24px)",
          }}
        >
          {hasMenu ? `Live at /r/${restaurant?.slug}` : "No items live yet"}
        </div>
      </div>

      {published === "1" && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Your menu is live at{" "}
          <Link
            href={`/r/${restaurant?.slug}`}
            target="_blank"
            className="font-medium underline underline-offset-4"
          >
            /r/{restaurant?.slug}
          </Link>
        </div>
      )}

      {hasMenu ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Published menu</CardTitle>
              <CardDescription>
                {stats?.categoryCount} categories · {stats?.itemCount} items
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/r/${restaurant?.slug}`} target="_blank">
                  View guest menu
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={`/dashboard/${restaurantId}/menu/edit`}>
                  Edit menu
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={`/dashboard/${restaurantId}/menu/onboarding`}>
                  <Plus className="h-4 w-4" />
                  Re-import menu
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Category overview */}
          {categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  What&apos;s on your menu right now.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                      <span className="font-medium text-sm">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {cat.itemCount} item{cat.itemCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Onboard your menu</CardTitle>
                <CardDescription className="mt-1">
                  Upload photos, a PDF, or import from a URL. Review AI results
                  before publishing.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/dashboard/${restaurantId}/menu/onboarding`}>
                Start menu onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
