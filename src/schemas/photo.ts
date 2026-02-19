import { z } from "zod";

export const PhotoStatusSchema = z.enum([
  "unreviewed",
  "keep",
  "discard",
  "maybe",
]);
export type PhotoStatus = z.infer<typeof PhotoStatusSchema>;

export const PhotoSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fileSizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  hash: z.string().optional(),
  perceptualHash: z.string().optional(),
  status: PhotoStatusSchema,
  fileExists: z.boolean(),
  importedAt: z.string().datetime(),
  takenAt: z.string().datetime().optional(),
});
export type Photo = z.infer<typeof PhotoSchema>;

export const PhotoFilterSchema = z.enum([
  "all",
  "unreviewed",
  "keep",
  "discard",
  "maybe",
]);
export type PhotoFilter = z.infer<typeof PhotoFilterSchema>;

export const DuplicateGroupSchema = z.object({
  hash: z.string().min(1),
  photos: z.array(PhotoSchema).min(2),
});
export type DuplicateGroup = z.infer<typeof DuplicateGroupSchema>;

export const DuplicateGroupsResponseSchema = z.object({
  groups: z.array(DuplicateGroupSchema),
  totalDuplicatePhotos: z.number().int().nonnegative(),
});
export type DuplicateGroupsResponse = z.infer<
  typeof DuplicateGroupsResponseSchema
>;

export const SimilarGroupSchema = z.object({
  groupId: z.number().int().nonnegative(),
  photos: z.array(PhotoSchema).min(2),
});
export type SimilarGroup = z.infer<typeof SimilarGroupSchema>;

export const SimilarGroupsResponseSchema = z.object({
  groups: z.array(SimilarGroupSchema),
  totalSimilarPhotos: z.number().int().nonnegative(),
});
export type SimilarGroupsResponse = z.infer<typeof SimilarGroupsResponseSchema>;

export const ViewModeSchema = z.enum(["browse", "duplicates", "similar"]);
export type ViewMode = z.infer<typeof ViewModeSchema>;

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;
