import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { scanPhotos } from "@/lib/photo-scanner";
import { computeSyncDiff } from "./sync-diff";

export type { SyncResult, SyncDiff } from "./sync-diff";
export { computeSyncDiff } from "./sync-diff";

/**
 * Sync a project's photos between the filesystem and database.
 */
export async function syncProjectPhotos(
  projectId: string,
  inputDir: string,
): Promise<import("./sync-diff").SyncResult> {
  const fsPhotos = await scanPhotos(inputDir, projectId);

  const dbPhotos = await db
    .select({
      id: photos.id,
      fileName: photos.fileName,
      fileExists: photos.fileExists,
    })
    .from(photos)
    .where(eq(photos.projectId, projectId));

  const diff = computeSyncDiff(fsPhotos, dbPhotos);

  // Insert new photos
  if (diff.toInsert.length > 0) {
    await db.insert(photos).values(
      diff.toInsert.map((p) => ({
        id: p.id,
        projectId: p.projectId,
        fileName: p.fileName,
        filePath: p.filePath,
        width: p.width,
        height: p.height,
        fileSizeBytes: p.fileSizeBytes,
        mimeType: p.mimeType,
        hash: p.hash ?? null,
        perceptualHash: p.perceptualHash ?? null,
        status: p.status as "unreviewed" | "keep" | "discard" | "maybe",
        fileExists: true,
        importedAt: new Date(p.importedAt),
        takenAt: p.takenAt ? new Date(p.takenAt) : null,
      })),
    );
  }

  // Mark removed photos
  for (const id of diff.toRemove) {
    await db.update(photos).set({ fileExists: false }).where(eq(photos.id, id));
  }

  // Restore re-appeared photos
  for (const id of diff.toRestore) {
    await db.update(photos).set({ fileExists: true }).where(eq(photos.id, id));
  }

  const totalCount = dbPhotos.length + diff.toInsert.length;

  return {
    added: diff.toInsert.length,
    removed: diff.toRemove.length,
    restored: diff.toRestore.length,
    total: totalCount,
  };
}
