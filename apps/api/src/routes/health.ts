import type { FastifyInstance } from "fastify";

import { dbFilePath } from "../db/path.js";

export function registerHealthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      dbFilePath
    };
  });
}
