import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic"]);

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/heic",
};

const INPUT_DIR = path.resolve(process.cwd(), "data", "input");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Security: reject path traversal
  if (
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..")
  ) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 403 });
  }

  const safeName = path.basename(filename);
  const ext = path.extname(safeName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 400 },
    );
  }

  const filePath = path.resolve(INPUT_DIR, safeName);

  // Double-check the resolved path is inside INPUT_DIR
  if (!filePath.startsWith(INPUT_DIR + path.sep)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 403 });
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
