import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { PhotoStatusSchema } from "@/schemas";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; photoId: string }> },
) {
  const { photoId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("status" in body)) {
    return NextResponse.json(
      { error: "Missing status field" },
      { status: 400 },
    );
  }

  const statusResult = PhotoStatusSchema.safeParse(
    (body as Record<string, unknown>).status,
  );
  if (!statusResult.success) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 },
    );
  }

  const updated = await db
    .update(photos)
    .set({ status: statusResult.data })
    .where(eq(photos.id, photoId))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const p = updated[0];
  return NextResponse.json({
    id: p.id,
    projectId: p.projectId,
    fileName: p.fileName,
    filePath: p.filePath,
    width: p.width,
    height: p.height,
    fileSizeBytes: p.fileSizeBytes,
    mimeType: p.mimeType,
    hash: p.hash,
    status: p.status,
    fileExists: p.fileExists,
    importedAt: p.importedAt.toISOString(),
    takenAt: p.takenAt?.toISOString() ?? undefined,
  });
}
