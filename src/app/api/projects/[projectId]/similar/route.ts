import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import type { Photo, SimilarGroup } from "@/schemas";
import { groupSimilarPhotos } from "@/lib/similarity-grouping";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const thresholdParam = request.nextUrl.searchParams.get("threshold");
  const threshold = thresholdParam ? parseInt(thresholdParam, 10) : undefined;

  // Fetch all photos for this project with a perceptual hash
  const projectPhotos = await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.projectId, projectId),
        eq(photos.fileExists, true),
        isNotNull(photos.perceptualHash),
      ),
    );

  if (projectPhotos.length < 2) {
    return NextResponse.json({ groups: [], totalSimilarPhotos: 0 });
  }

  // Group by similarity
  const photoInputs = projectPhotos.map((p) => ({
    id: p.id,
    perceptualHash: p.perceptualHash,
  }));
  const groupMap = groupSimilarPhotos(photoInputs, threshold);

  if (groupMap.size === 0) {
    return NextResponse.json({ groups: [], totalSimilarPhotos: 0 });
  }

  // Build a lookup of photo data by ID
  const photoById = new Map<string, Photo>();
  for (const p of projectPhotos) {
    photoById.set(p.id, {
      id: p.id,
      projectId: p.projectId,
      fileName: p.fileName,
      filePath: p.filePath,
      width: p.width,
      height: p.height,
      fileSizeBytes: p.fileSizeBytes,
      mimeType: p.mimeType,
      hash: p.hash ?? undefined,
      perceptualHash: p.perceptualHash ?? undefined,
      status: p.status as Photo["status"],
      fileExists: p.fileExists,
      importedAt: p.importedAt.toISOString(),
      takenAt: p.takenAt?.toISOString() ?? undefined,
    });
  }

  const groups: SimilarGroup[] = [];
  let totalSimilarPhotos = 0;

  for (const [groupId, memberIds] of groupMap) {
    const groupPhotos = memberIds
      .map((id) => photoById.get(id))
      .filter((p): p is Photo => p !== undefined);

    if (groupPhotos.length >= 2) {
      groups.push({ groupId, photos: groupPhotos });
      totalSimilarPhotos += groupPhotos.length;
    }
  }

  return NextResponse.json({ groups, totalSimilarPhotos });
}
