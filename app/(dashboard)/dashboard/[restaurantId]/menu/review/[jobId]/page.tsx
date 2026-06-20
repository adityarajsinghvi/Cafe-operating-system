import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { MenuReviewEditor } from "@/components/onboarding/menu-review-editor";
import { Button } from "@/components/ui/button";
import { getMenuDraftByJobId } from "@/services/menu.service";
import { menuDraftSummarySchema } from "@/types/menu";

export default async function MenuReviewPage({
  params,
}: {
  params: Promise<{ restaurantId: string; jobId: string }>;
}) {
  const { restaurantId, jobId } = await params;
  const draft = await getMenuDraftByJobId(jobId, restaurantId);

  if (!draft) {
    notFound();
  }

  const summary = menuDraftSummarySchema.parse(draft.summary);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-24 md:pb-8">
      <Button variant="ghost" size="sm" className="gap-2 px-0" asChild>
        <Link href={`/dashboard/${restaurantId}/menu/onboarding`}>
          <ArrowLeft className="h-4 w-4" />
          Back to upload
        </Link>
      </Button>

      <MenuReviewEditor
        restaurantId={restaurantId}
        draftId={draft.id}
        initialPayload={draft.payload}
        initialSummary={summary}
      />
    </div>
  );
}
