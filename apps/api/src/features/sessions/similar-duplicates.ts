import { randomUUID } from "node:crypto";

import type {
  PhotoGroupResult,
  SimilarDuplicateAnalysisResult
} from "@picture-pruner/shared";
import { and, eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { groupItems, groups, photos, sessionPhotos, sessions } from "../../db/schema.js";

type SessionPhoto = {
  photoId: string;
  sourcePath: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  takenAt: Date | null;
  sha256: string | null;
};

type SimilarEdge = {
  leftIndex: number;
  rightIndex: number;
  score: number;
};

const TIME_WINDOW_MS = 45_000;

class UnionFind {
  private readonly parent: number[];
  private readonly size: number[];

  constructor(length: number) {
    this.parent = Array.from({ length }, (_, index) => index);
    this.size = Array.from({ length }, () => 1);
  }

  find(node: number): number {
    if (this.parent[node] !== node) {
      this.parent[node] = this.find(this.parent[node]);
    }
    return this.parent[node];
  }

  union(left: number, right: number) {
    let leftRoot = this.find(left);
    let rightRoot = this.find(right);
    if (leftRoot === rightRoot) {
      return;
    }

    if (this.size[leftRoot] < this.size[rightRoot]) {
      [leftRoot, rightRoot] = [rightRoot, leftRoot];
    }

    this.parent[rightRoot] = leftRoot;
    this.size[leftRoot] += this.size[rightRoot];
  }
}

function getTakenAtMs(takenAt: Date | null) {
  return takenAt ? takenAt.getTime() : null;
}

function getSimilarityScore(left: SessionPhoto, right: SessionPhoto) {
  if (!left.takenAt || !right.takenAt) {
    return null;
  }
  if (
    left.width === null ||
    left.height === null ||
    right.width === null ||
    right.height === null
  ) {
    return null;
  }
  if (left.sha256 && right.sha256 && left.sha256 === right.sha256) {
    return null;
  }

  const timeDifference = Math.abs(left.takenAt.getTime() - right.takenAt.getTime());
  if (timeDifference > TIME_WINDOW_MS) {
    return null;
  }

  const widthRatio = Math.min(left.width, right.width) / Math.max(left.width, right.width);
  const heightRatio = Math.min(left.height, right.height) / Math.max(left.height, right.height);
  const dimensionScore = (widthRatio + heightRatio) / 2;

  const sizeRatio = Math.min(left.fileSize, right.fileSize) / Math.max(left.fileSize, right.fileSize);
  const timeScore = 1 - timeDifference / TIME_WINDOW_MS;

  if (dimensionScore < 0.9 || sizeRatio < 0.55) {
    return null;
  }

  const score = (timeScore * 0.45) + (dimensionScore * 0.35) + (sizeRatio * 0.2);
  return score >= 0.72 ? score : null;
}

function mapGroupRows(rows: Array<{
  groupId: string;
  createdAt: Date;
  confidence: number;
  photoId: string;
  sourcePath: string;
  rank: number | null;
}>): PhotoGroupResult[] {
  const grouped = new Map<string, PhotoGroupResult>();

  for (const row of rows) {
    const existing = grouped.get(row.groupId) ?? {
      id: row.groupId,
      createdAt: row.createdAt.toISOString(),
      confidence: row.confidence,
      photos: []
    };

    existing.photos.push({
      id: row.photoId,
      sourcePath: row.sourcePath,
      rank: row.rank
    });
    grouped.set(row.groupId, existing);
  }

  return Array.from(grouped.values()).map((group) => ({
    ...group,
    photos: group.photos.sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0))
  }));
}

export async function analyzeSimilarCandidatesForSession(sessionId: string) {
  const sessionExists = await db.query.sessions.findFirst({
    columns: { id: true },
    where: eq(sessions.id, sessionId)
  });
  if (!sessionExists) {
    throw new Error(`Session ${sessionId} does not exist`);
  }

  const startedAt = new Date();
  const rows = await db
    .select({
      photoId: photos.id,
      sourcePath: photos.sourcePath,
      fileSize: photos.fileSize,
      width: photos.width,
      height: photos.height,
      takenAt: photos.takenAt,
      sha256: photos.sha256
    })
    .from(sessionPhotos)
    .innerJoin(photos, eq(photos.id, sessionPhotos.photoId))
    .where(eq(sessionPhotos.sessionId, sessionId));

  const sessionPhotosList = [...rows].sort((left, right) => {
    const leftTakenAt = getTakenAtMs(left.takenAt);
    const rightTakenAt = getTakenAtMs(right.takenAt);

    if (leftTakenAt === null && rightTakenAt === null) {
      return left.sourcePath.localeCompare(right.sourcePath);
    }
    if (leftTakenAt === null) {
      return 1;
    }
    if (rightTakenAt === null) {
      return -1;
    }

    return leftTakenAt - rightTakenAt;
  });

  const uf = new UnionFind(sessionPhotosList.length);
  const edges: SimilarEdge[] = [];

  for (let leftIndex = 0; leftIndex < sessionPhotosList.length; leftIndex += 1) {
    const leftPhoto = sessionPhotosList[leftIndex];
    const leftTakenAt = getTakenAtMs(leftPhoto.takenAt);
    if (leftTakenAt === null) {
      continue;
    }

    for (let rightIndex = leftIndex + 1; rightIndex < sessionPhotosList.length; rightIndex += 1) {
      const rightPhoto = sessionPhotosList[rightIndex];
      const rightTakenAt = getTakenAtMs(rightPhoto.takenAt);
      if (rightTakenAt === null) {
        continue;
      }

      if (rightTakenAt - leftTakenAt > TIME_WINDOW_MS) {
        break;
      }

      const score = getSimilarityScore(leftPhoto, rightPhoto);
      if (score === null) {
        continue;
      }

      uf.union(leftIndex, rightIndex);
      edges.push({ leftIndex, rightIndex, score });
    }
  }

  const groupsByRoot = new Map<number, number[]>();
  for (let index = 0; index < sessionPhotosList.length; index += 1) {
    const root = uf.find(index);
    const bucket = groupsByRoot.get(root) ?? [];
    bucket.push(index);
    groupsByRoot.set(root, bucket);
  }

  const candidateComponents = Array.from(groupsByRoot.values()).filter(
    (component) => component.length >= 2
  );

  await db
    .delete(groups)
    .where(and(eq(groups.sessionId, sessionId), eq(groups.kind, "similar")));

  let candidatePhotoCount = 0;
  if (candidateComponents.length > 0) {
    const scoreByRoot = new Map<number, { sum: number; count: number }>();
    for (const edge of edges) {
      const root = uf.find(edge.leftIndex);
      const entry = scoreByRoot.get(root) ?? { sum: 0, count: 0 };
      entry.sum += edge.score;
      entry.count += 1;
      scoreByRoot.set(root, entry);
    }

    const now = new Date();
    for (const component of candidateComponents) {
      const root = uf.find(component[0]);
      const confidenceStats = scoreByRoot.get(root) ?? { sum: 0.75, count: 1 };
      const confidence = confidenceStats.sum / confidenceStats.count;

      const rankedPhotos = component
        .map((index) => sessionPhotosList[index])
        .sort(
          (left, right) =>
            (getTakenAtMs(left.takenAt) ?? Number.MAX_SAFE_INTEGER) -
            (getTakenAtMs(right.takenAt) ?? Number.MAX_SAFE_INTEGER)
        );

      const groupId = randomUUID();
      await db.insert(groups).values({
        id: groupId,
        sessionId,
        kind: "similar",
        confidence,
        createdAt: now
      });

      await db.insert(groupItems).values(
        rankedPhotos.map((photo, rank) => ({
          groupId,
          photoId: photo.photoId,
          score: confidence,
          rank,
          createdAt: now
        }))
      );

      candidatePhotoCount += rankedPhotos.length;
    }
  }

  const finishedAt = new Date();
  return {
    sessionId,
    scannedPhotoCount: sessionPhotosList.length,
    candidateGroupCount: candidateComponents.length,
    candidatePhotoCount,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString()
  } satisfies SimilarDuplicateAnalysisResult;
}

export async function listSimilarDuplicateGroupsForSession(sessionId: string) {
  const rows = await db
    .select({
      groupId: groups.id,
      createdAt: groups.createdAt,
      confidence: groups.confidence,
      photoId: photos.id,
      sourcePath: photos.sourcePath,
      rank: groupItems.rank
    })
    .from(groups)
    .innerJoin(groupItems, eq(groupItems.groupId, groups.id))
    .innerJoin(photos, eq(photos.id, groupItems.photoId))
    .where(and(eq(groups.sessionId, sessionId), eq(groups.kind, "similar")));

  return mapGroupRows(rows);
}
