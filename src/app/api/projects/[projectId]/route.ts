import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { UpdateProjectSchema } from "@/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: project.id,
    name: project.name,
    inputDir: project.inputDir,
    outputDir: project.outputDir ?? undefined,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const deleted = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { outputDir } = parsed.data;

  // Validate directory exists on filesystem
  try {
    const dirStat = await stat(outputDir);
    if (!dirStat.isDirectory()) {
      return NextResponse.json(
        { error: "outputDir is not a directory" },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "outputDir does not exist on the filesystem" },
      { status: 400 },
    );
  }

  const updated = await db
    .update(projects)
    .set({ outputDir })
    .where(eq(projects.id, projectId))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = updated[0];
  return NextResponse.json({
    id: project.id,
    name: project.name,
    inputDir: project.inputDir,
    outputDir: project.outputDir ?? undefined,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
}
