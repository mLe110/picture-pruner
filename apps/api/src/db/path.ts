import path from "node:path";

const defaultDbFilePath = path.resolve(
  process.cwd(),
  "data",
  "picture-pruner.db"
);

export const dbFilePath = process.env.DATABASE_URL
  ? path.resolve(process.env.DATABASE_URL)
  : defaultDbFilePath;
