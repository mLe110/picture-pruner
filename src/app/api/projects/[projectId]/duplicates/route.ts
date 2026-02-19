import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import type { Photo, DuplicateGroup } from "@/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  // Find hashes that appear more than once for existing files in this project
  const duplicateHashes = await db
    .select({ hash: photos.hash })
    .from(photos)
    .where(
      and(
        eq(photos.projectId, projectId),
        eq(photos.fileExists, true),
        isNotNull(photos.hash),
      ),
    )
    .groupBy(photos.hash)
    .having(sql`count(*) > 1`);

  const hashValues = duplicateHashes
    .map((r) => r.hash)
    .filter((h): h is string => h !== null);

  if (hashValues.length === 0) {
    return NextResponse.json({ groups: [], totalDuplicatePhotos: 0 });
  }

  // Fetch all photos for those duplicate hashes
  const duplicatePhotos = await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.projectId, projectId),
        eq(photos.fileExists, true),
        inArray(photos.hash, hashValues),
      ),
    );

  // Group by hash
  const groupMap = new Map<string, Photo[]>();
  for (const p of duplicatePhotos) {
    if (!p.hash) continue;
    const photo: Photo = {
      id: p.id,
      projectId: p.projectId,
      fileName: p.fileName,
      filePath: p.filePath,
      width: p.width,
      height: p.height,
      fileSizeBytes: p.fileSizeBytes,
      mimeType: p.mimeType,
      hash: p.hash,
      status: p.status as Photo["status"],
      fileExists: p.fileExists,
      importedAt: p.importedAt.toISOString(),
      takenAt: p.takenAt?.toISOString() ?? undefined,
    };
    const existing = groupMap.get(p.hash);
    if (existing) {
      existing.push(photo);
    } else {
      groupMap.set(p.hash, [photo]);
    }
  }

  const groups: DuplicateGroup[] = [];
  let totalDuplicatePhotos = 0;
  for (const [hash, photoList] of groupMap) {
    if (photoList.length >= 2) {
      groups.push({ hash, photos: photoList });
      totalDuplicatePhotos += photoList.length;
    }
  }

  return NextResponse.json({ groups, totalDuplicatePhotos });
}
