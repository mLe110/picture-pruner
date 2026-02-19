import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    filePath: text("file_path").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    mimeType: text("mime_type").notNull(),
    hash: text("hash"),
    perceptualHash: text("perceptual_hash"),
    status: text("status", {
      enum: ["unreviewed", "keep", "discard", "maybe"],
    })
      .notNull()
      .default("unreviewed"),
    fileExists: boolean("file_exists").notNull().default(true),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    takenAt: timestamp("taken_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("photos_project_id_file_name_idx").on(
      table.projectId,
      table.fileName,
    ),
    index("photos_project_id_idx").on(table.projectId),
    index("photos_status_idx").on(table.status),
    index("photos_project_id_hash_idx").on(table.projectId, table.hash),
  ],
);
