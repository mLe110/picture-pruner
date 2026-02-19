import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, photos } from "@/db/schema";
import { syncProjectPhotos } from "@/lib/photo-sync";
import { PhotoBrowser } from "@/components/photo-browser";
import type { Photo } from "@/schemas";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    notFound();
  }

  // Auto-sync on page load
  await syncProjectPhotos(projectId, project.inputDir);

  // Fetch photos after sync
  const dbPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.projectId, projectId));

  const photoList: Photo[] = dbPhotos.map((p) => ({
    id: p.id,
    projectId: p.projectId,
    fileName: p.fileName,
    filePath: p.filePath,
    width: p.width,
    height: p.height,
    fileSizeBytes: p.fileSizeBytes,
    mimeType: p.mimeType,
    hash: p.hash ?? undefined,
    status: p.status as Photo["status"],
    fileExists: p.fileExists,
    importedAt: p.importedAt.toISOString(),
    takenAt: p.takenAt?.toISOString(),
  }));

  return (
    <PhotoBrowser
      initialPhotos={photoList}
      projectId={projectId}
      projectName={project.name}
      outputDir={project.outputDir ?? undefined}
    />
  );
}
