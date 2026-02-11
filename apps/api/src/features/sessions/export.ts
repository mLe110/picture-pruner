import fs from "node:fs/promises";
import path from "node:path";

import type { ExportSessionResult } from "@picture-pruner/shared";
import { and, eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { decisions, photos, sessions } from "../../db/schema.js";

async function ensureWritableDirectory(targetPath: string) {
  const resolvedPath = path.resolve(targetPath);
  await fs.mkdir(resolvedPath, { recursive: true });

  const stat = await fs.stat(resolvedPath).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Export path is not a writable directory: ${resolvedPath}`);
  }

  return resolvedPath;
}

function sanitizeRelativePath(filePath: string) {
  return filePath
    .split(path.sep)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
    .join(path.sep);
}

function deriveExportRelativePath(
  sourcePath: string,
  importRoot: string,
  photoId: string
) {
  const relativeToImportRoot = path.relative(importRoot, sourcePath);
  const isWithinImportRoot =
    relativeToImportRoot.length > 0 &&
    !relativeToImportRoot.startsWith("..") &&
    !path.isAbsolute(relativeToImportRoot);

  if (isWithinImportRoot) {
    const sanitized = sanitizeRelativePath(relativeToImportRoot);
    if (sanitized.length > 0) {
      return sanitized;
    }
  }

  const filename = path.basename(sourcePath);
  return path.join("_external", `${photoId.slice(0, 8)}-${filename}`);
}

async function ensureUniqueDestinationPath(destinationPath: string, photoId: string) {
  const existing = await fs.stat(destinationPath).catch(() => null);
  if (!existing) {
    return destinationPath;
  }

  const parsed = path.parse(destinationPath);
  return path.join(parsed.dir, `${parsed.name}__${photoId.slice(0, 8)}${parsed.ext}`);
}

export async function exportSelectedPhotosForSession(sessionId: string, outputRoot: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId)
  });
  if (!session) {
    throw new Error(`Session ${sessionId} does not exist`);
  }

  const resolvedOutputRoot = await ensureWritableDirectory(outputRoot);
  const startedAt = new Date();

  const selectedPhotos = await db
    .select({
      photoId: photos.id,
      sourcePath: photos.sourcePath,
      takenAt: photos.takenAt
    })
    .from(decisions)
    .innerJoin(photos, eq(photos.id, decisions.photoId))
    .where(and(eq(decisions.sessionId, sessionId), eq(decisions.decision, "keep")));

  let exportedPhotoCount = 0;
  let missingSourceCount = 0;
  let skippedCount = 0;

  for (const selectedPhoto of selectedPhotos) {
    const sourceStat = await fs.stat(selectedPhoto.sourcePath).catch(() => null);
    if (!sourceStat || !sourceStat.isFile()) {
      missingSourceCount += 1;
      continue;
    }

    const exportRelativePath = deriveExportRelativePath(
      selectedPhoto.sourcePath,
      session.importRoot,
      selectedPhoto.photoId
    );
    const targetPath = path.join(resolvedOutputRoot, exportRelativePath);
    const uniqueTargetPath = await ensureUniqueDestinationPath(targetPath, selectedPhoto.photoId);

    await fs.mkdir(path.dirname(uniqueTargetPath), { recursive: true });

    try {
      await fs.copyFile(selectedPhoto.sourcePath, uniqueTargetPath);
      await fs.utimes(uniqueTargetPath, sourceStat.atime, sourceStat.mtime);
      exportedPhotoCount += 1;
    } catch {
      skippedCount += 1;
    }
  }

  const finishedAt = new Date();
  return {
    sessionId,
    outputRoot: resolvedOutputRoot,
    selectedPhotoCount: selectedPhotos.length,
    exportedPhotoCount,
    missingSourceCount,
    skippedCount,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString()
  } satisfies ExportSessionResult;
}
