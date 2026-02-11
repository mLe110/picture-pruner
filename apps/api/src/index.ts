import { createServer } from "./server.js";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3001);

const app = createServer();

app
  .listen({ host, port })
  .then(() => {
    app.log.info(`API listening on http://${host}:${port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
