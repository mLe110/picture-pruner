import { copyFile, stat } from "node:fs/promises";
import path from "node:path";

interface ExportablePhoto {
  fileName: string;
  filePath: string;
}

export interface ExportResult {
  exported: number;
  skipped: number;
  failed: number;
}

export async function exportPhotos(
  photos: ExportablePhoto[],
  outputDir: string,
): Promise<ExportResult> {
  let exported = 0;
  let skipped = 0;
  let failed = 0;

  for (const photo of photos) {
    const destPath = path.join(outputDir, photo.fileName);

    try {
      await stat(destPath);
      // File already exists — skip
      skipped++;
    } catch {
      // File does not exist — copy it
      try {
        await copyFile(photo.filePath, destPath);
        exported++;
      } catch {
        failed++;
      }
    }
  }

  return { exported, skipped, failed };
}
