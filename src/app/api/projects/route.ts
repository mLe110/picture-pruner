import { NextRequest, NextResponse } from "next/server";
import { stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { CreateProjectSchema } from "@/schemas";

export async function GET() {
  const allProjects = await db.select().from(projects);

  return NextResponse.json(
    allProjects.map((p) => ({
      id: p.id,
      name: p.name,
      inputDir: p.inputDir,
      outputDir: p.outputDir ?? undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, inputDir, outputDir } = parsed.data;

  // Validate directory exists on filesystem
  try {
    const dirStat = await stat(inputDir);
    if (!dirStat.isDirectory()) {
      return NextResponse.json(
        { error: "inputDir is not a directory" },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "inputDir does not exist on the filesystem" },
      { status: 400 },
    );
  }

  // Validate outputDir if provided
  if (outputDir) {
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
  }

  try {
    const id = randomUUID();
    const now = new Date();

    const [created] = await db
      .insert(projects)
      .values({
        id,
        name,
        inputDir,
        outputDir: outputDir ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        inputDir: created.inputDir,
        outputDir: created.outputDir ?? undefined,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: "A project with this name already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}
