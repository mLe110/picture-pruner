import Fastify from "fastify";

import { registerSessionRoutes } from "./features/sessions/routes.js";
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
  registerSessionRoutes(app);

  return app;
}
