import type {
  DecisionValue,
  PickGroupPhotoResult,
  SessionDecisionRecord,
  SessionProgressSummary
} from "@picture-pruner/shared";
import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import { decisions, groupItems, groups, photos, sessionPhotos, sessions } from "../../db/schema.js";

type DecisionCountRow = {
  decision: DecisionValue;
  count: number;
};

function mapDecisionRows(
  rows: Array<{
    sessionId: string;
    photoId: string;
    sourcePath: string;
    decision: DecisionValue;
    reason: string | null;
    updatedAt: Date;
  }>
) {
  return rows.map(
    (row) =>
      ({
        sessionId: row.sessionId,
        photoId: row.photoId,
        sourcePath: row.sourcePath,
        decision: row.decision,
        reason: row.reason,
        updatedAt: row.updatedAt.toISOString()
      }) satisfies SessionDecisionRecord
  );
}

async function assertSessionExists(sessionId: string) {
  const existingSession = await db.query.sessions.findFirst({
    columns: { id: true },
    where: eq(sessions.id, sessionId)
  });
  if (!existingSession) {
    throw new Error(`Session ${sessionId} does not exist`);
  }
}

async function assertPhotoInSession(sessionId: string, photoId: string) {
  const existingPhotoLink = await db.query.sessionPhotos.findFirst({
    columns: { sessionId: true },
    where: and(eq(sessionPhotos.sessionId, sessionId), eq(sessionPhotos.photoId, photoId))
  });
  if (!existingPhotoLink) {
    throw new Error(`Photo ${photoId} is not part of session ${sessionId}`);
  }
}

export async function setSessionPhotoDecision(
  sessionId: string,
  photoId: string,
  decision: DecisionValue,
  reason: string | null
) {
  await assertSessionExists(sessionId);
  await assertPhotoInSession(sessionId, photoId);

  const now = new Date();
  await db
    .insert(decisions)
    .values({
      sessionId,
      photoId,
      decision,
      reason,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [decisions.sessionId, decisions.photoId],
      set: {
        decision,
        reason,
        updatedAt: now
      }
    });

  const row = await db
    .select({
      sessionId: decisions.sessionId,
      photoId: decisions.photoId,
      sourcePath: photos.sourcePath,
      decision: decisions.decision,
      reason: decisions.reason,
      updatedAt: decisions.updatedAt
    })
    .from(decisions)
    .innerJoin(photos, eq(photos.id, decisions.photoId))
    .where(and(eq(decisions.sessionId, sessionId), eq(decisions.photoId, photoId)))
    .then((items) => items[0]);

  if (!row) {
    throw new Error("Failed to persist decision");
  }

  return {
    sessionId: row.sessionId,
    photoId: row.photoId,
    sourcePath: row.sourcePath,
    decision: row.decision,
    reason: row.reason,
    updatedAt: row.updatedAt.toISOString()
  } satisfies SessionDecisionRecord;
}

export async function clearSessionPhotoDecision(sessionId: string, photoId: string) {
  await assertSessionExists(sessionId);
  await assertPhotoInSession(sessionId, photoId);

  await db
    .delete(decisions)
    .where(and(eq(decisions.sessionId, sessionId), eq(decisions.photoId, photoId)));
}

export async function listSessionDecisions(sessionId: string) {
  await assertSessionExists(sessionId);

  const rows = await db
    .select({
      sessionId: decisions.sessionId,
      photoId: decisions.photoId,
      sourcePath: photos.sourcePath,
      decision: decisions.decision,
      reason: decisions.reason,
      updatedAt: decisions.updatedAt
    })
    .from(decisions)
    .innerJoin(photos, eq(photos.id, decisions.photoId))
    .where(eq(decisions.sessionId, sessionId));

  return mapDecisionRows(rows);
}

export async function getSessionProgress(sessionId: string) {
  await assertSessionExists(sessionId);

  const totalPhotos =
    (
      await db
        .select({
          count: sql<number>`count(*)`
        })
        .from(sessionPhotos)
        .where(eq(sessionPhotos.sessionId, sessionId))
    )[0]?.count ?? 0;

  const decisionCounts = await db
    .select({
      decision: decisions.decision,
      count: sql<number>`count(*)`
    })
    .from(decisions)
    .where(eq(decisions.sessionId, sessionId))
    .groupBy(decisions.decision);

  const countByDecision = decisionCounts.reduce<Record<DecisionValue, number>>(
    (accumulator, row: DecisionCountRow) => ({
      ...accumulator,
      [row.decision]: row.count
    }),
    {
      keep: 0,
      reject: 0,
      maybe: 0
    }
  );

  const groupedCounts = await db
    .select({
      kind: groups.kind,
      count: sql<number>`count(*)`
    })
    .from(groups)
    .where(eq(groups.sessionId, sessionId))
    .groupBy(groups.kind);

  let exactGroupCount = 0;
  let similarGroupCount = 0;
  for (const row of groupedCounts) {
    if (row.kind === "exact") {
      exactGroupCount = row.count;
    }
    if (row.kind === "similar") {
      similarGroupCount = row.count;
    }
  }

  const undecidedCount = Math.max(
    totalPhotos - (countByDecision.keep + countByDecision.reject + countByDecision.maybe),
    0
  );

  return {
    sessionId,
    totalPhotos,
    keepCount: countByDecision.keep,
    rejectCount: countByDecision.reject,
    maybeCount: countByDecision.maybe,
    undecidedCount,
    exactGroupCount,
    similarGroupCount
  } satisfies SessionProgressSummary;
}

export async function pickGroupPhoto(
  sessionId: string,
  groupId: string,
  keepPhotoId: string,
  rejectOthers: boolean,
  reason: string | null
) {
  await assertSessionExists(sessionId);

  const group = await db.query.groups.findFirst({
    columns: {
      id: true
    },
    where: and(eq(groups.id, groupId), eq(groups.sessionId, sessionId))
  });
  if (!group) {
    throw new Error(`Group ${groupId} does not exist in session ${sessionId}`);
  }

  const groupPhotoRows = await db
    .select({
      photoId: groupItems.photoId
    })
    .from(groupItems)
    .where(eq(groupItems.groupId, groupId));

  if (groupPhotoRows.length === 0) {
    throw new Error(`Group ${groupId} has no photos`);
  }

  const groupPhotoIds = groupPhotoRows.map((row) => row.photoId);
  if (!groupPhotoIds.includes(keepPhotoId)) {
    throw new Error(`Photo ${keepPhotoId} is not part of group ${groupId}`);
  }

  const now = new Date();
  await db
    .insert(decisions)
    .values({
      sessionId,
      photoId: keepPhotoId,
      decision: "keep",
      reason,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [decisions.sessionId, decisions.photoId],
      set: {
        decision: "keep",
        reason,
        updatedAt: now
      }
    });

  let updatedCount = 1;
  if (rejectOthers) {
    const rejectPhotoIds = groupPhotoIds.filter((photoId) => photoId !== keepPhotoId);
    if (rejectPhotoIds.length > 0) {
      await db
        .insert(decisions)
        .values(
          rejectPhotoIds.map((photoId) => ({
            sessionId,
            photoId,
            decision: "reject" as const,
            reason: "Auto-rejected after group pick",
            updatedAt: now
          }))
        )
        .onConflictDoUpdate({
          target: [decisions.sessionId, decisions.photoId],
          set: {
            decision: "reject",
            reason: "Auto-rejected after group pick",
            updatedAt: now
          }
        });
      updatedCount += rejectPhotoIds.length;
    }
  }

  return {
    sessionId,
    groupId,
    keepPhotoId,
    rejectOthers,
    updatedCount
  } satisfies PickGroupPhotoResult;
}
