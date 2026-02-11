import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";

import type { ExactDuplicateAnalysisResult } from "@picture-pruner/shared";
import { and, eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { groupItems, groups, photos, sessionPhotos, sessions } from "../../db/schema.js";

function hashFileSha256(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const hash = createHash("sha256");

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("error", (error) => {
      reject(error);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}

export async function analyzeExactDuplicatesForSession(sessionId: string) {
  const sessionExists = await db.query.sessions.findFirst({
    columns: { id: true },
    where: eq(sessions.id, sessionId)
  });
  if (!sessionExists) {
    throw new Error(`Session ${sessionId} does not exist`);
  }

  const startedAt = new Date();
  let hashedPhotoCount = 0;
  let missingFileCount = 0;

  const sessionPhotoRows = await db
    .select({
      photoId: photos.id,
      sourcePath: photos.sourcePath,
      sha256: photos.sha256
    })
    .from(sessionPhotos)
    .innerJoin(photos, eq(photos.id, sessionPhotos.photoId))
    .where(eq(sessionPhotos.sessionId, sessionId));

  const hashToPhotoIds = new Map<string, string[]>();

  for (const row of sessionPhotoRows) {
    let sha256 = row.sha256;
    if (!sha256) {
      try {
        sha256 = await hashFileSha256(row.sourcePath);
        hashedPhotoCount += 1;

        await db
          .update(photos)
          .set({ sha256 })
          .where(eq(photos.id, row.photoId));
      } catch {
        missingFileCount += 1;
        continue;
      }
    }

    const bucket = hashToPhotoIds.get(sha256) ?? [];
    bucket.push(row.photoId);
    hashToPhotoIds.set(sha256, bucket);
  }

  const duplicateBuckets = Array.from(hashToPhotoIds.values()).filter(
    (photoIds) => photoIds.length >= 2
  );

  await db
    .delete(groups)
    .where(and(eq(groups.sessionId, sessionId), eq(groups.kind, "exact")));

  if (duplicateBuckets.length > 0) {
    const now = new Date();
    for (const bucket of duplicateBuckets) {
      const groupId = randomUUID();
      await db.insert(groups).values({
        id: groupId,
        sessionId,
        kind: "exact",
        confidence: 1,
        createdAt: now
      });

      await db.insert(groupItems).values(
        bucket.map((photoId, index) => ({
          groupId,
          photoId,
          rank: index,
          score: 1,
          createdAt: now
        }))
      );
    }
  }

  const duplicatePhotoCount = duplicateBuckets.reduce(
    (sum, bucket) => sum + bucket.length,
    0
  );
  const finishedAt = new Date();

  return {
    sessionId,
    scannedPhotoCount: sessionPhotoRows.length,
    hashedPhotoCount,
    duplicateGroupCount: duplicateBuckets.length,
    duplicatePhotoCount,
    missingFileCount,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString()
  } satisfies ExactDuplicateAnalysisResult;
}

export async function listExactDuplicateGroupsForSession(sessionId: string) {
  const rows = await db
    .select({
      groupId: groups.id,
      createdAt: groups.createdAt,
      photoId: photos.id,
      sourcePath: photos.sourcePath,
      rank: groupItems.rank
    })
    .from(groups)
    .innerJoin(groupItems, eq(groupItems.groupId, groups.id))
    .innerJoin(photos, eq(photos.id, groupItems.photoId))
    .where(and(eq(groups.sessionId, sessionId), eq(groups.kind, "exact")));

  const grouped = new Map<
    string,
    {
      id: string;
      createdAt: string;
      photos: Array<{ id: string; sourcePath: string; rank: number | null }>;
    }
  >();

  for (const row of rows) {
    const entry = grouped.get(row.groupId) ?? {
      id: row.groupId,
      createdAt: row.createdAt.toISOString(),
      photos: []
    };
    entry.photos.push({
      id: row.photoId,
      sourcePath: row.sourcePath,
      rank: row.rank
    });
    grouped.set(row.groupId, entry);
  }

  return Array.from(grouped.values()).map((group) => ({
    ...group,
    photos: group.photos.sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0))
  }));
}
