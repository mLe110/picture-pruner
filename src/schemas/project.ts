import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  inputDir: z.string().min(1),
  outputDir: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  inputDir: z.string().min(1),
  outputDir: z.string().optional(),
});
export type CreateProject = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  outputDir: z.string().min(1),
});
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
