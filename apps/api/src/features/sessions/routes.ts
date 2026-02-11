import type { FastifyInstance } from "fastify";
import { decisionValues } from "@picture-pruner/shared";
import type { DecisionValue } from "@picture-pruner/shared";

import {
  analyzeExactDuplicatesForSession,
  listExactDuplicateGroupsForSession
} from "./exact-duplicates.js";
import {
  clearSessionPhotoDecision,
  getSessionProgress,
  listSessionDecisions,
  setSessionPhotoDecision
} from "./review.js";
import {
  createSession,
  getSession,
  importPhotosForSession,
  listSessionPhotos,
  listSessions
} from "./service.js";
import {
  analyzeSimilarCandidatesForSession,
  listSimilarDuplicateGroupsForSession
} from "./similar-duplicates.js";

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return payload as Record<string, unknown>;
}

function getStringField(payload: unknown, key: string) {
  const record = asRecord(payload);
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getOptionalStringField(payload: unknown, key: string) {
  const record = asRecord(payload);
  const value = record?.[key];
  return typeof value === "string" ? value.trim() : null;
}

function isDecisionValue(value: string): value is DecisionValue {
  return decisionValues.includes(value as DecisionValue);
}

export function registerSessionRoutes(app: FastifyInstance) {
  app.get("/api/sessions", async () => {
    const sessions = await listSessions();
    return { sessions };
  });

  app.get("/api/sessions/:sessionId", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = await getSession(sessionId);
    if (!session) {
      reply.status(404);
      return { error: `Session ${sessionId} not found` };
    }

    return { session };
  });

  app.get("/api/sessions/:sessionId/photos", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      const photos = await listSessionPhotos(sessionId);
      return { photos };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to list session photos";
      reply.status(message.includes("does not exist") ? 404 : 400);
      return { error: message };
    }
  });

  app.post("/api/sessions", async (request, reply) => {
    const importRoot = getStringField(request.body, "importRoot");
    if (!importRoot) {
      reply.status(400);
      return { error: "Field 'importRoot' is required" };
    }

    try {
      const session = await createSession(importRoot);
      reply.status(201);
      return { session };
    } catch (error) {
      reply.status(400);
      return {
        error: error instanceof Error ? error.message : "Failed to create session"
      };
    }
  });

  app.post("/api/sessions/:sessionId/import", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const importRoot = getStringField(request.body, "importRoot");

    try {
      const result = await importPhotosForSession(sessionId, importRoot ?? undefined);
      return { result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import session photos";

      if (message.includes("does not exist")) {
        reply.status(404);
      } else {
        reply.status(400);
      }

      return { error: message };
    }
  });

  app.post("/api/sessions/:sessionId/analysis/exact-duplicates", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      const result = await analyzeExactDuplicatesForSession(sessionId);
      return { result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to analyze exact duplicates";

      if (message.includes("does not exist")) {
        reply.status(404);
      } else {
        reply.status(400);
      }

      return { error: message };
    }
  });

  app.get("/api/sessions/:sessionId/analysis/exact-duplicates", async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const groups = await listExactDuplicateGroupsForSession(sessionId);
    return { groups };
  });

  app.post("/api/sessions/:sessionId/analysis/similar-candidates", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      const result = await analyzeSimilarCandidatesForSession(sessionId);
      return { result };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to analyze similar candidates";

      if (message.includes("does not exist")) {
        reply.status(404);
      } else {
        reply.status(400);
      }

      return { error: message };
    }
  });

  app.get("/api/sessions/:sessionId/analysis/similar-candidates", async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const groups = await listSimilarDuplicateGroupsForSession(sessionId);
    return { groups };
  });

  app.get("/api/sessions/:sessionId/decisions", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      const decisions = await listSessionDecisions(sessionId);
      return { decisions };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to list decisions";
      reply.status(message.includes("does not exist") ? 404 : 400);
      return { error: message };
    }
  });

  app.put("/api/sessions/:sessionId/decisions/:photoId", async (request, reply) => {
    const { sessionId, photoId } = request.params as { sessionId: string; photoId: string };
    const decision = getStringField(request.body, "decision");
    const reason = getOptionalStringField(request.body, "reason");

    if (!decision || !isDecisionValue(decision)) {
      reply.status(400);
      return {
        error: `Field 'decision' is required and must be one of: ${decisionValues.join(", ")}`
      };
    }

    try {
      const record = await setSessionPhotoDecision(
        sessionId,
        photoId,
        decision,
        reason && reason.length > 0 ? reason : null
      );
      return { decision: record };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save decision";
      reply.status(
        message.includes("does not exist") || message.includes("is not part of session")
          ? 404
          : 400
      );
      return { error: message };
    }
  });

  app.delete("/api/sessions/:sessionId/decisions/:photoId", async (request, reply) => {
    const { sessionId, photoId } = request.params as { sessionId: string; photoId: string };

    try {
      await clearSessionPhotoDecision(sessionId, photoId);
      reply.status(204);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to clear decision";
      reply.status(
        message.includes("does not exist") || message.includes("is not part of session")
          ? 404
          : 400
      );
      return { error: message };
    }
  });

  app.get("/api/sessions/:sessionId/progress", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    try {
      const progress = await getSessionProgress(sessionId);
      return { progress };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load progress";
      reply.status(message.includes("does not exist") ? 404 : 400);
      return { error: message };
    }
  });
}
