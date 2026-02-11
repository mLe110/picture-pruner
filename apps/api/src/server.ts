import Fastify from "fastify";

import { registerHealthRoutes } from "./routes/health.js";

export function createServer() {
  const app = Fastify({
    logger: true
  });

  app.get("/", async () => {
    return {
      app: "picture-pruner-api",
      status: "ok"
    };
  });

  registerHealthRoutes(app);

  return app;
}
