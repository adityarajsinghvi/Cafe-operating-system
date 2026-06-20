import { NextResponse } from "next/server";

import {
  createExtractionJob,
  processExtractionJob,
  uploadMenuFiles,
} from "@/services/menu.service";
import type { ExtractionSource } from "@/types/database";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const formData = await request.formData();
  const source = formData.get("source")?.toString() as ExtractionSource | undefined;

  if (!source || !["photo", "pdf", "url"].includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  if (source === "url") {
    const url = formData.get("url")?.toString()?.trim();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const jobResult = await createExtractionJob({
      restaurantId,
      source,
      sourceUrl: url,
    });

    if ("error" in jobResult && jobResult.error) {
      return NextResponse.json({ error: jobResult.error }, { status: 403 });
    }

    const processResult = await processExtractionJob(jobResult.jobId!);

    return NextResponse.json({
      jobId: jobResult.jobId,
      status: processResult.status ?? "completed",
      error: "error" in processResult ? processResult.error : undefined,
    });
  }

  const files = formData.getAll("files").filter((entry): entry is File => {
    return entry instanceof File && entry.size > 0;
  });

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const uploadResult = await uploadMenuFiles(restaurantId, files, source);

  if ("error" in uploadResult && uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error }, { status: 400 });
  }

  const jobResult = await createExtractionJob({
    restaurantId,
    source,
    sourcePaths: uploadResult.paths,
  });

  if ("error" in jobResult && jobResult.error) {
    return NextResponse.json({ error: jobResult.error }, { status: 403 });
  }

  const processResult = await processExtractionJob(jobResult.jobId!);

  return NextResponse.json({
    jobId: jobResult.jobId,
    status: processResult.status ?? "completed",
    error: "error" in processResult ? processResult.error : undefined,
  });
}
