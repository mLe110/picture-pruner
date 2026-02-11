CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `import_root` text NOT NULL,
  `status` text NOT NULL CHECK (`status` IN ('active', 'completed', 'archived')),
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint

CREATE TABLE `photos` (
  `id` text PRIMARY KEY NOT NULL,
  `source_path` text NOT NULL,
  `file_size` integer NOT NULL,
  `mime_type` text,
  `width` integer,
  `height` integer,
  `taken_at` integer,
  `sha256` text,
  `phash` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX `photos_source_path_unique` ON `photos` (`source_path`);
--> statement-breakpoint
CREATE INDEX `photos_sha256_idx` ON `photos` (`sha256`);
--> statement-breakpoint
CREATE INDEX `photos_phash_idx` ON `photos` (`phash`);
--> statement-breakpoint

CREATE TABLE `groups` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `kind` text NOT NULL CHECK (`kind` IN ('exact', 'similar')),
  `confidence` real NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `groups_session_id_idx` ON `groups` (`session_id`);
--> statement-breakpoint

CREATE TABLE `group_items` (
  `group_id` text NOT NULL,
  `photo_id` text NOT NULL,
  `score` real,
  `rank` integer,
  `created_at` integer NOT NULL,
  PRIMARY KEY (`group_id`, `photo_id`),
  FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`photo_id`) REFERENCES `photos` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `group_items_photo_id_idx` ON `group_items` (`photo_id`);
--> statement-breakpoint

CREATE TABLE `decisions` (
  `session_id` text NOT NULL,
  `photo_id` text NOT NULL,
  `decision` text NOT NULL CHECK (`decision` IN ('keep', 'reject', 'maybe')),
  `reason` text,
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`session_id`, `photo_id`),
  FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`photo_id`) REFERENCES `photos` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `decisions_photo_id_idx` ON `decisions` (`photo_id`);
