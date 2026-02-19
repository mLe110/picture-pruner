import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { projects, photos } from "@/db/schema";
import { exportPhotos } from "@/lib/photo-export";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.outputDir) {
    return NextResponse.json(
      { error: "Project has no output directory configured" },
      { status: 400 },
    );
  }

  // Validate outputDir still exists on disk
  try {
    const dirStat = await stat(project.outputDir);
    if (!dirStat.isDirectory()) {
      return NextResponse.json(
        { error: "Output directory is not a directory" },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Output directory does not exist on the filesystem" },
      { status: 400 },
    );
  }

  // Query photos with status "keep" and fileExists true
  const keepPhotos = await db
    .select({ fileName: photos.fileName, filePath: photos.filePath })
    .from(photos)
    .where(
      and(
        eq(photos.projectId, projectId),
        eq(photos.status, "keep"),
        eq(photos.fileExists, true),
      ),
    );

  if (keepPhotos.length === 0) {
    return NextResponse.json({
      exported: 0,
      skipped: 0,
      failed: 0,
      total: 0,
    });
  }

  const result = await exportPhotos(keepPhotos, project.outputDir);

  return NextResponse.json({
    ...result,
    total: keepPhotos.length,
  });
}
