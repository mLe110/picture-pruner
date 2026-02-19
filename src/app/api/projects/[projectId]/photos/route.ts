import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { PhotoStatusSchema } from "@/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { searchParams } = request.nextUrl;
  const statusFilter = searchParams.get("status");
  const fileExistsFilter = searchParams.get("fileExists");

  const conditions = [eq(photos.projectId, projectId)];

  if (statusFilter) {
    const parsed = PhotoStatusSchema.safeParse(statusFilter);
    if (parsed.success) {
      conditions.push(eq(photos.status, parsed.data));
    }
  }

  if (fileExistsFilter !== null) {
    conditions.push(eq(photos.fileExists, fileExistsFilter === "true"));
  }

  const result = await db
    .select()
    .from(photos)
    .where(and(...conditions));

  return NextResponse.json(
    result.map((p) => ({
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
    })),
  );
}
