import type { Photo } from "@/schemas";

export interface SyncResult {
  added: number;
  removed: number;
  restored: number;
  total: number;
}

interface DbPhoto {
  id: string;
  fileName: string;
  fileExists: boolean;
}

export interface SyncDiff {
  toInsert: Photo[];
  toRemove: string[];
  toRestore: string[];
}

/**
 * Pure function that computes the diff between filesystem photos and DB photos.
 * Testable without a database.
 */
export function computeSyncDiff(
  fsPhotos: Photo[],
  dbPhotos: DbPhoto[],
): SyncDiff {
  const dbByFileName = new Map(dbPhotos.map((p) => [p.fileName, p]));
  const fsFileNames = new Set(fsPhotos.map((p) => p.fileName));

  const toInsert: Photo[] = [];
  const toRemove: string[] = [];
  const toRestore: string[] = [];

  // New files: on disk but not in DB
  for (const fsPhoto of fsPhotos) {
    if (!dbByFileName.has(fsPhoto.fileName)) {
      toInsert.push(fsPhoto);
    }
  }

  // Removed files: in DB but not on disk, and currently fileExists=true
  // Re-appeared files: in DB with fileExists=false, back on disk
  for (const dbPhoto of dbPhotos) {
    const onDisk = fsFileNames.has(dbPhoto.fileName);
    if (!onDisk && dbPhoto.fileExists) {
      toRemove.push(dbPhoto.id);
    } else if (onDisk && !dbPhoto.fileExists) {
      toRestore.push(dbPhoto.id);
    }
  }

  return { toInsert, toRemove, toRestore };
}
