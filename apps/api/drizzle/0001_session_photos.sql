CREATE TABLE `session_photos` (
  `session_id` text NOT NULL,
  `photo_id` text NOT NULL,
  `imported_at` integer NOT NULL,
  PRIMARY KEY (`session_id`, `photo_id`),
  FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`photo_id`) REFERENCES `photos` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `session_photos_photo_id_idx` ON `session_photos` (`photo_id`);
