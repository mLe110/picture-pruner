import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { imageSizeFromFile } from "image-size/fromFile";
import { PhotoSchema, type Photo } from "@/schemas";
import { computePerceptualHash } from "@/lib/perceptual-hash";

const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic"]);

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/heic",
};

/**
 * Generate a deterministic UUID from a project ID and file name using SHA-256.
 * Formatted as UUID v4 (version nibble = 4, variant bits = 10xx).
 */
export function generatePhotoId(projectId: string, fileName: string): string {
  const hash = createHash("sha256")
    .update(`${projectId}:${fileName}`)
    .digest("hex");
  // Format as UUID: 8-4-4-4-12
  // Set version nibble (position 12) to 4
  // Set variant bits (position 16) to 8–b
  const uuid = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16)}${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
  return uuid;
}

/**
 * Compute a SHA-256 content hash for a file using streaming reads.
 * Returns a 64-character lowercase hex string.
 */
export function computeFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Scan a directory for image files and return Photo metadata.
 * Returns empty array if the directory is empty or missing.
 */
export async function scanPhotos(
  inputDir: string,
  projectId: string,
): Promise<Photo[]> {
  const dir = inputDir;

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const photos: Photo[] = [];

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

    const filePath = path.join(dir, entry);

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) continue;

      const dimensions = await imageSizeFromFile(filePath);
      let width = dimensions.width ?? 0;
      let height = dimensions.height ?? 0;

      // Handle EXIF orientation: values 5–8 mean the image is rotated 90/270°
      const orientation = dimensions.orientation;
      if (orientation && orientation >= 5 && orientation <= 8) {
        [width, height] = [height, width];
      }

      const hash = await computeFileHash(filePath);
      let perceptualHash: string | undefined;
      try {
        perceptualHash = await computePerceptualHash(filePath);
      } catch {
        // Perceptual hash is best-effort; skip if sharp can't process the image
      }

      const photo = PhotoSchema.parse({
        id: generatePhotoId(projectId, entry),
        projectId,
        fileName: entry,
        filePath: filePath,
        width,
        height,
        fileSizeBytes: fileStat.size,
        mimeType: MIME_BY_EXT[ext] ?? "application/octet-stream",
        hash,
        perceptualHash,
        status: "unreviewed",
        fileExists: true,
        importedAt: fileStat.mtime.toISOString(),
      });

      photos.push(photo);
    } catch (err) {
      console.warn(
        `Skipping ${entry}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return photos;
}
