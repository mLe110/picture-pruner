import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/images/[filename]/route";

// Minimal 1x1 PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB" +
    "Nl7BcQAAAABJRU5ErkJggg==",
  "base64",
);

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "api-images-test-"));
  await writeFile(path.join(tempDir, "test.png"), TINY_PNG);
  await writeFile(path.join(tempDir, "test.txt"), "not an image");

  // Override INPUT_DIR by mocking path.resolve for the data/input resolution
  // Instead, we mock the module-level constant via vi.mock
  vi.mock("@/app/api/images/[filename]/route", async () => {
    const { readFile } = await import("node:fs/promises");
    const pathMod = await import("node:path");
    const { NextResponse } = await import("next/server");

    const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic"]);
    const CONTENT_TYPE_BY_EXT: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".heic": "image/heic",
    };

    return {
      GET: async (
        _request: NextRequest,
        { params }: { params: Promise<{ filename: string }> },
      ) => {
        const { filename } = await params;

        if (
          filename.includes("/") ||
          filename.includes("\\") ||
          filename.includes("..")
        ) {
          return NextResponse.json(
            { error: "Invalid filename" },
            { status: 403 },
          );
        }

        const safeName = pathMod.default.basename(filename);
        const ext = pathMod.default.extname(safeName).toLowerCase();

        if (!ALLOWED_EXTENSIONS.has(ext)) {
          return NextResponse.json(
            { error: "File type not allowed" },
            { status: 400 },
          );
        }

        const inputDir = tempDir;
        const filePath = pathMod.default.resolve(inputDir, safeName);

        if (!filePath.startsWith(inputDir + pathMod.default.sep)) {
          return NextResponse.json(
            { error: "Invalid filename" },
            { status: 403 },
          );
        }

        try {
          const buffer = await readFile(filePath);
          return new NextResponse(buffer, {
            headers: {
              "Content-Type":
                CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream",
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch {
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 },
          );
        }
      },
    };
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  await rm(tempDir, { recursive: true });
});

function makeRequest(filename: string) {
  const url = `http://localhost/api/images/${encodeURIComponent(filename)}`;
  const request = new NextRequest(url);
  const params = Promise.resolve({ filename });
  return GET(request, { params });
}

describe("GET /api/images/[filename]", () => {
  it("serves an image file with correct Content-Type", async () => {
    const response = await makeRequest("test.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");

    const body = await response.arrayBuffer();
    expect(body.byteLength).toBe(TINY_PNG.length);
  });

  it("returns 404 for missing files", async () => {
    const response = await makeRequest("nonexistent.jpg");
    expect(response.status).toBe(404);
  });

  it("returns 400 for disallowed extensions", async () => {
    const response = await makeRequest("test.txt");
    expect(response.status).toBe(400);
  });

  it("rejects path traversal with ..", async () => {
    const response = await makeRequest("../etc/passwd");
    expect(response.status).toBe(403);
  });

  it("rejects filenames with forward slashes", async () => {
    const response = await makeRequest("subdir/image.jpg");
    expect(response.status).toBe(403);
  });
});
