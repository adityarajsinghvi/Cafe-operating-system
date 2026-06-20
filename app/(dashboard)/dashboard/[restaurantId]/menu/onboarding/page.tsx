import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { MenuUploadForm } from "@/components/onboarding/menu-upload-form";
import { getMenuExtractionProviderName } from "@/lib/extraction";
import { Button } from "@/components/ui/button";

export default async function MenuOnboardingPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const provider = getMenuExtractionProviderName();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2 px-0" asChild>
          <Link href={`/dashboard/${restaurantId}/menu`}>
            <ArrowLeft className="h-4 w-4" />
            Back to menu
          </Link>
        </Button>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Smart menu onboarding
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Choose how you want to import your menu. AI will structure everything
            for you.
            {provider === "mock" && (
              <span className="mt-1 block text-amber-600 dark:text-amber-400">
                Demo mode: add GEMINI_API_KEY for real extraction.
              </span>
            )}
            {provider === "gemini" && (
              <span className="mt-1 block text-green-600 dark:text-green-400">
                Powered by Google Gemini
              </span>
            )}
          </p>
        </div>
      </div>

      <MenuUploadForm restaurantId={restaurantId} />
    </div>
  );
}
