import path from "node:path";
import { fileURLToPath } from "node:url";

const dbFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data"
);

const defaultDbFilePath = path.join(dbFolder, "picture-pruner.db");

export const dbFilePath = process.env.DATABASE_URL
  ? path.resolve(process.env.DATABASE_URL)
  : defaultDbFilePath;
