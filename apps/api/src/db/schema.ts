import type { DecisionValue, DuplicateGroupKind, SessionStatus } from "@picture-pruner/shared";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  importRoot: text("import_root").notNull(),
  status: text("status").$type<SessionStatus>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull()
});

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    sourcePath: text("source_path").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    takenAt: integer("taken_at", { mode: "timestamp_ms" }),
    sha256: text("sha256"),
    pHash: text("phash"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
  },
  (table) => [
    uniqueIndex("photos_source_path_unique").on(table.sourcePath),
    index("photos_sha256_idx").on(table.sha256),
    index("photos_phash_idx").on(table.pHash)
  ]
);

export const groups = sqliteTable(
  "groups",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    kind: text("kind").$type<DuplicateGroupKind>().notNull(),
    confidence: real("confidence").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
  },
  (table) => [index("groups_session_id_idx").on(table.sessionId)]
);

export const groupItems = sqliteTable(
  "group_items",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    score: real("score"),
    rank: integer("rank"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.photoId] }),
    index("group_items_photo_id_idx").on(table.photoId)
  ]
);

export const decisions = sqliteTable(
  "decisions",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    decision: text("decision").$type<DecisionValue>().notNull(),
    reason: text("reason"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull()
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.photoId] }),
    index("decisions_photo_id_idx").on(table.photoId)
  ]
);

export const sessionsRelations = relations(sessions, ({ many }) => ({
  groups: many(groups),
  decisions: many(decisions)
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  session: one(sessions, {
    fields: [groups.sessionId],
    references: [sessions.id]
  }),
  items: many(groupItems)
}));

export const photosRelations = relations(photos, ({ many }) => ({
  groupItems: many(groupItems),
  decisions: many(decisions)
}));

export const groupItemsRelations = relations(groupItems, ({ one }) => ({
  group: one(groups, {
    fields: [groupItems.groupId],
    references: [groups.id]
  }),
  photo: one(photos, {
    fields: [groupItems.photoId],
    references: [photos.id]
  })
}));

export const decisionsRelations = relations(decisions, ({ one }) => ({
  session: one(sessions, {
    fields: [decisions.sessionId],
    references: [sessions.id]
  }),
  photo: one(photos, {
    fields: [decisions.photoId],
    references: [photos.id]
  })
}));
