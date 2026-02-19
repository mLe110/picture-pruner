import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET } from "@/app/api/filesystem/browse/route";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "browse-test-"));
  await mkdir(join(tempDir, "alpha"));
  await mkdir(join(tempDir, "beta"));
  await mkdir(join(tempDir, "gamma"));
  await mkdir(join(tempDir, ".hidden"));
  await writeFile(join(tempDir, "file.txt"), "hello");
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("GET /api/filesystem/browse", () => {
  it("lists directories at the given path", async () => {
    const request = new NextRequest(
      `http://localhost/api/filesystem/browse?path=${encodeURIComponent(tempDir)}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.path).toBe(tempDir);
    expect(data.entries).toHaveLength(3);
    expect(data.entries.map((e: { name: string }) => e.name)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });

  it("excludes hidden directories", async () => {
    const request = new NextRequest(
      `http://localhost/api/filesystem/browse?path=${encodeURIComponent(tempDir)}`,
    );
    const response = await GET(request);
    const data = await response.json();

    const names = data.entries.map((e: { name: string }) => e.name);
    expect(names).not.toContain(".hidden");
  });

  it("excludes files from entries", async () => {
    const request = new NextRequest(
      `http://localhost/api/filesystem/browse?path=${encodeURIComponent(tempDir)}`,
    );
    const response = await GET(request);
    const data = await response.json();

    const names = data.entries.map((e: { name: string }) => e.name);
    expect(names).not.toContain("file.txt");
  });

  it("returns entries sorted alphabetically", async () => {
    const request = new NextRequest(
      `http://localhost/api/filesystem/browse?path=${encodeURIComponent(tempDir)}`,
    );
    const response = await GET(request);
    const data = await response.json();

    const names = data.entries.map((e: { name: string }) => e.name);
    expect(names).toEqual([...names].sort());
  });

  it("includes parent path", async () => {
    const request = new NextRequest(
      `http://localhost/api/filesystem/browse?path=${encodeURIComponent(tempDir)}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.parent).toBeTruthy();
    expect(tempDir.startsWith(data.parent)).toBe(true);
  });

  it("returns null parent at filesystem root", async () => {
    const request = new NextRequest(
      "http://localhost/api/filesystem/browse?path=/",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.parent).toBeNull();
  });

  it("returns 404 for nonexistent path", async () => {
    const request = new NextRequest(
      "http://localhost/api/filesystem/browse?path=/nonexistent/path/abc123",
    );
    const response = await GET(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Path not found");
  });

  it("returns 400 for a file path", async () => {
    const filePath = join(tempDir, "file.txt");
    const request = new NextRequest(
      `http://localhost/api/filesystem/browse?path=${encodeURIComponent(filePath)}`,
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Path is not a directory");
  });

  it("defaults to home directory when no path is provided", async () => {
    const request = new NextRequest("http://localhost/api/filesystem/browse");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.path).toBeTruthy();
    expect(Array.isArray(data.entries)).toBe(true);
  });

  it("returns full absolute paths for entries", async () => {
    const request = new NextRequest(
      `http://localhost/api/filesystem/browse?path=${encodeURIComponent(tempDir)}`,
    );
    const response = await GET(request);
    const data = await response.json();

    for (const entry of data.entries) {
      expect(entry.path).toBe(join(tempDir, entry.name));
    }
  });

  it("returns empty entries for an empty directory", async () => {
    const emptyDir = join(tempDir, "alpha");
    const request = new NextRequest(
      `http://localhost/api/filesystem/browse?path=${encodeURIComponent(emptyDir)}`,
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.entries).toEqual([]);
  });
});
