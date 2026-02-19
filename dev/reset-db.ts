/**
 * Dev utility: reset the database by truncating all application tables.
 * Projects and photos are deleted; schema and migrations are preserved.
 *
 * Usage: pnpm db:reset
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://picture_pruner:picture_pruner_dev@localhost:5432/picture_pruner";

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function main() {
  console.log("Resetting database...");

  // Truncate in dependency order (photos references projects)
  await db.execute(sql`TRUNCATE photos, projects CASCADE`);

  console.log("Done — all photos and projects deleted.");
  await client.end();
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
