import type { FastifyInstance } from "fastify";

import {
  createSession,
  getSession,
  importPhotosForSession,
  listSessions
} from "./service.js";

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
}
