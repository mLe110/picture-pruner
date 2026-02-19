"use client";

import Link from "next/link";
import { FolderIcon, ImageIcon, ChevronRightIcon } from "lucide-react";

interface ProjectInfo {
  id: string;
  name: string;
  inputDir: string;
  photoCount: number;
  unreviewedCount: number;
}

interface ProjectListProps {
  projects: ProjectInfo[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
          <FolderIcon className="size-6 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">
          No projects yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a project to start curating your photos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="group flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-lg hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <ChevronRightIcon className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {project.inputDir}
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="size-4" />
              {project.photoCount} photos
            </span>
            {project.unreviewedCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {project.unreviewedCount} to review
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
