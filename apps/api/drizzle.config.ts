import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "drizzle-kit";

const dbFilePath = process.env.DATABASE_URL
  ? path.resolve(process.env.DATABASE_URL)
  : path.resolve(process.cwd(), "data", "picture-pruner.db");

fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbFilePath
  },
  strict: true,
  verbose: true
});
