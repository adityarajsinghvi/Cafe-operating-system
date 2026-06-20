import { NextResponse } from "next/server";

import { getExtractionJob } from "@/services/menu.service";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ restaurantId: string; jobId: string }> },
) {
  const { restaurantId, jobId } = await params;
  const job = await getExtractionJob(jobId, restaurantId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    errorMessage: job.error_message,
  });
}
