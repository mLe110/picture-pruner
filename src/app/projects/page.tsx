import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, photos } from "@/db/schema";
import { Header } from "@/components/header";
import { ProjectList } from "@/components/project-list";
import { CreateProjectDialog } from "@/components/create-project-dialog";

export default async function ProjectsPage() {
  const allProjects = await db.select().from(projects);

  const projectInfos = await Promise.all(
    allProjects.map(async (project) => {
      const [counts] = await db
        .select({
          total: sql<number>`count(*)::int`,
          unreviewed: sql<number>`count(*) filter (where ${photos.status} = 'unreviewed')::int`,
        })
        .from(photos)
        .where(eq(photos.projectId, project.id));

      return {
        id: project.id,
        name: project.name,
        inputDir: project.inputDir,
        photoCount: counts?.total ?? 0,
        unreviewedCount: counts?.unreviewed ?? 0,
      };
    }),
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Projects</h2>
          <CreateProjectDialog />
        </div>
        <ProjectList projects={projectInfos} />
      </main>
    </div>
  );
}
