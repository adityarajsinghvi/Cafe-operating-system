import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { MenuEditor } from "@/components/dashboard/menu-editor";
import { Button } from "@/components/ui/button";
import { getPublishedMenuForEdit } from "@/services/menu.service";
import { listSections } from "@/services/sections.service";

export default async function MenuEditPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const [menu, sections] = await Promise.all([
    getPublishedMenuForEdit(restaurantId),
    listSections(restaurantId),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/${restaurantId}/menu`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Edit menu
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Update prices, availability, and item details without re-importing.
        </p>
      </div>

      <MenuEditor
        restaurantId={restaurantId}
        categories={menu?.categories ?? []}
        sections={sections}
      />
    </div>
  );
}
