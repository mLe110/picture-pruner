import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type {
  ImportSessionResult,
  SessionPhotoRecord,
  SessionStatus,
  SessionSummary
} from "@picture-pruner/shared";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import { decisions, photos, sessionPhotos, sessions } from "../../db/schema.js";

type Dimensions = {
  width: number;
  height: number;
};

const supportedMimeByExtension: Record<string, string> = {
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp"
};

const supportedExtensions = new Set(Object.keys(supportedMimeByExtension));

function mapSessionRowToSummary(row: {
  id: string;
  importRoot: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  photoCount: number;
}): SessionSummary {
  return {
    id: row.id,
    importRoot: row.importRoot,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    photoCount: row.photoCount
  };
}

async function resolveExistingDirectory(targetPath: string) {
  const resolvedPath = path.resolve(targetPath);
  const stat = await fs.stat(resolvedPath).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Import path is not a readable directory: ${resolvedPath}`);
  }

  return resolvedPath;
}

function getMimeTypeByExtension(filePath: string) {
  return supportedMimeByExtension[path.extname(filePath).toLowerCase()] ?? null;
}

function isSupportedPhoto(filePath: string) {
  return supportedExtensions.has(path.extname(filePath).toLowerCase());
}

async function collectSupportedPhotoFiles(rootPath: string) {
  const pendingDirectories = [rootPath];
  const files: string[] = [];

  while (pendingDirectories.length > 0) {
    const currentDirectory = pendingDirectories.pop();
    if (!currentDirectory) {
      continue;
    }

    const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        pendingDirectories.push(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (isSupportedPhoto(absolutePath)) {
        files.push(absolutePath);
      }
    }
  }

  files.sort((left, right) => left.localeCompare(right));
  return files;
}

function parseJpegDimensions(buffer: Buffer): Dimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    offset += 2;

    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }

    if (offset + 1 >= buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break;
    }

    const isSofMarker =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;

    if (isSofMarker && segmentLength >= 7) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    offset += segmentLength;
  }

  return null;
}

function parsePngDimensions(buffer: Buffer): Dimensions | null {
  const pngHeader = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngHeader) {
    return null;
  }

  const chunkName = buffer.subarray(12, 16).toString("ascii");
  if (chunkName !== "IHDR") {
    return null;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

async function readImageDimensions(filePath: string, mimeType: string | null) {
  if (mimeType !== "image/jpeg" && mimeType !== "image/png") {
    return null;
  }

  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(256 * 1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const chunk = buffer.subarray(0, bytesRead);

    if (mimeType === "image/jpeg") {
      return parseJpegDimensions(chunk);
    }

    return parsePngDimensions(chunk);
  } catch {
    return null;
  } finally {
    await handle.close();
  }
}

function deriveTakenAtFromStat(stat: Awaited<ReturnType<typeof fs.stat>>) {
  const birthtimeMs = Number(stat.birthtimeMs);
  if (birthtimeMs > 0 && Number.isFinite(birthtimeMs)) {
    return new Date(birthtimeMs);
  }

  return new Date(Number(stat.mtimeMs));
}

export async function createSession(importRoot: string) {
  const resolvedImportRoot = await resolveExistingDirectory(importRoot);
  const now = new Date();

  const sessionId = randomUUID();
  await db.insert(sessions).values({
    id: sessionId,
    importRoot: resolvedImportRoot,
    status: "active",
    createdAt: now,
    updatedAt: now
  });

  return {
    id: sessionId,
    importRoot: resolvedImportRoot,
    status: "active",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    photoCount: 0
  } satisfies SessionSummary;
}

export async function listSessions() {
  const rows = await db
    .select({
      id: sessions.id,
      importRoot: sessions.importRoot,
      status: sessions.status,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
      photoCount: sql<number>`count(${sessionPhotos.photoId})`
    })
    .from(sessions)
    .leftJoin(sessionPhotos, eq(sessionPhotos.sessionId, sessions.id))
    .groupBy(sessions.id)
    .orderBy(desc(sessions.createdAt));

  return rows.map(mapSessionRowToSummary);
}

export async function getSession(sessionId: string) {
  const rows = await db
    .select({
      id: sessions.id,
      importRoot: sessions.importRoot,
      status: sessions.status,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
      photoCount: sql<number>`count(${sessionPhotos.photoId})`
    })
    .from(sessions)
    .leftJoin(sessionPhotos, eq(sessionPhotos.sessionId, sessions.id))
    .where(eq(sessions.id, sessionId))
    .groupBy(sessions.id);

  const row = rows[0];
  return row ? mapSessionRowToSummary(row) : null;
}

export async function listSessionPhotos(sessionId: string) {
  const sessionExists = await db.query.sessions.findFirst({
    columns: { id: true },
    where: eq(sessions.id, sessionId)
  });
  if (!sessionExists) {
    throw new Error(`Session ${sessionId} does not exist`);
  }

  const rows = await db
    .select({
      id: photos.id,
      sourcePath: photos.sourcePath,
      fileSize: photos.fileSize,
      width: photos.width,
      height: photos.height,
      takenAt: photos.takenAt,
      decision: decisions.decision
    })
    .from(sessionPhotos)
    .innerJoin(photos, eq(photos.id, sessionPhotos.photoId))
    .leftJoin(
      decisions,
      and(
        eq(decisions.sessionId, sessionPhotos.sessionId),
        eq(decisions.photoId, sessionPhotos.photoId)
      )
    )
    .where(eq(sessionPhotos.sessionId, sessionId))
    .orderBy(photos.takenAt, photos.sourcePath);

  return rows.map(
    (row) =>
      ({
        id: row.id,
        sourcePath: row.sourcePath,
        fileSize: row.fileSize,
        width: row.width,
        height: row.height,
        takenAt: row.takenAt ? row.takenAt.toISOString() : null,
        decision: row.decision ?? null
      }) satisfies SessionPhotoRecord
  );
}

export async function importPhotosForSession(
  sessionId: string,
  importRootOverride?: string
) {
  const existingSession = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId)
  });
  if (!existingSession) {
    throw new Error(`Session ${sessionId} does not exist`);
  }

  const importRoot = await resolveExistingDirectory(
    importRootOverride ?? existingSession.importRoot
  );
  const startedAt = new Date();
  let importedPhotoCount = 0;
  let updatedPhotoCount = 0;
  let linkedExistingCount = 0;
  let skippedFileCount = 0;

  const photoFiles = await collectSupportedPhotoFiles(importRoot);

  await db
    .update(sessions)
    .set({
      importRoot,
      updatedAt: startedAt
    })
    .where(eq(sessions.id, sessionId));

  for (const filePath of photoFiles) {
    try {
      const stat = await fs.stat(filePath);
      const mimeType = getMimeTypeByExtension(filePath);
      const dimensions = await readImageDimensions(filePath, mimeType);
      const existingPhoto = await db.query.photos.findFirst({
        columns: {
          id: true
        },
        where: eq(photos.sourcePath, filePath)
      });

      let photoId = existingPhoto?.id;
      if (!existingPhoto) {
        photoId = randomUUID();
        await db.insert(photos).values({
          id: photoId,
          sourcePath: filePath,
          fileSize: Number(stat.size),
          mimeType,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          takenAt: deriveTakenAtFromStat(stat),
          createdAt: new Date()
        });
        importedPhotoCount += 1;
      } else {
        await db
          .update(photos)
          .set({
            fileSize: Number(stat.size),
            mimeType,
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
            takenAt: deriveTakenAtFromStat(stat)
          })
          .where(eq(photos.id, existingPhoto.id));
        updatedPhotoCount += 1;
      }

      if (!photoId) {
        skippedFileCount += 1;
        continue;
      }

      const existingLink = await db.query.sessionPhotos.findFirst({
        columns: {
          sessionId: true
        },
        where: and(
          eq(sessionPhotos.sessionId, sessionId),
          eq(sessionPhotos.photoId, photoId)
        )
      });

      if (existingLink) {
        linkedExistingCount += 1;
        continue;
      }

      await db.insert(sessionPhotos).values({
        sessionId,
        photoId,
        importedAt: new Date()
      });
    } catch {
      skippedFileCount += 1;
    }
  }

  const finishedAt = new Date();
  await db
    .update(sessions)
    .set({
      updatedAt: finishedAt
    })
    .where(eq(sessions.id, sessionId));

  return {
    sessionId,
    importRoot,
    scannedFileCount: photoFiles.length,
    importedPhotoCount,
    updatedPhotoCount,
    linkedExistingCount,
    skippedFileCount,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString()
  } satisfies ImportSessionResult;
}
