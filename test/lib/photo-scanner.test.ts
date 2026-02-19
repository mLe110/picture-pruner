import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PhotoSchema } from "@/schemas";
import {
  computeFileHash,
  generatePhotoId,
  scanPhotos,
} from "@/lib/photo-scanner";

const TEST_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";

// Minimal valid 1x1 PNG (67 bytes)
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB" +
    "Nl7BcQAAAABJRU5ErkJggg==",
  "base64",
);

// Minimal valid 1x1 JPEG
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS" +
    "Ew8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJ" +
    "CQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy" +
    "MjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=",
  "base64",
);

async function createTempDir(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "photo-scanner-test-"));
}

describe("generatePhotoId", () => {
  it("returns a valid UUID", () => {
    const id = generatePhotoId(TEST_PROJECT_ID, "test.jpg");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("is deterministic for the same project and filename", () => {
    expect(generatePhotoId(TEST_PROJECT_ID, "photo.jpg")).toBe(
      generatePhotoId(TEST_PROJECT_ID, "photo.jpg"),
    );
  });

  it("produces different IDs for different filenames", () => {
    expect(generatePhotoId(TEST_PROJECT_ID, "a.jpg")).not.toBe(
      generatePhotoId(TEST_PROJECT_ID, "b.jpg"),
    );
  });

  it("produces different IDs for different projects", () => {
    const otherProject = "660e8400-e29b-41d4-a716-446655440000";
    expect(generatePhotoId(TEST_PROJECT_ID, "a.jpg")).not.toBe(
      generatePhotoId(otherProject, "a.jpg"),
    );
  });
});

describe("computeFileHash", () => {
  it("returns a 64-char lowercase hex string", async () => {
    const dir = await createTempDir();
    try {
      const filePath = path.join(dir, "test.bin");
      await writeFile(filePath, "hello world");
      const hash = await computeFileHash(filePath);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("returns the same hash for identical content", async () => {
    const dir = await createTempDir();
    try {
      await writeFile(path.join(dir, "a.bin"), "identical content");
      await writeFile(path.join(dir, "b.bin"), "identical content");
      const hashA = await computeFileHash(path.join(dir, "a.bin"));
      const hashB = await computeFileHash(path.join(dir, "b.bin"));
      expect(hashA).toBe(hashB);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("returns different hashes for different content", async () => {
    const dir = await createTempDir();
    try {
      await writeFile(path.join(dir, "a.bin"), "content A");
      await writeFile(path.join(dir, "b.bin"), "content B");
      const hashA = await computeFileHash(path.join(dir, "a.bin"));
      const hashB = await computeFileHash(path.join(dir, "b.bin"));
      expect(hashA).not.toBe(hashB);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("rejects for non-existent file", async () => {
    await expect(computeFileHash("/nonexistent/file.bin")).rejects.toThrow();
  });
});

describe("scanPhotos", () => {
  it("returns Photo[] with correct metadata for valid images", async () => {
    const dir = await createTempDir();
    try {
      await writeFile(path.join(dir, "test.png"), TINY_PNG);
      const photos = await scanPhotos(dir, TEST_PROJECT_ID);

      expect(photos).toHaveLength(1);
      expect(photos[0].projectId).toBe(TEST_PROJECT_ID);
      expect(photos[0].fileName).toBe("test.png");
      expect(photos[0].width).toBe(1);
      expect(photos[0].height).toBe(1);
      expect(photos[0].mimeType).toBe("image/png");
      expect(photos[0].status).toBe("unreviewed");
      expect(photos[0].fileExists).toBe(true);
      expect(photos[0].fileSizeBytes).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("returns empty array for empty directory", async () => {
    const dir = await createTempDir();
    try {
      const photos = await scanPhotos(dir, TEST_PROJECT_ID);
      expect(photos).toEqual([]);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("returns empty array for missing directory", async () => {
    const photos = await scanPhotos(
      "/nonexistent/path/that/does/not/exist",
      TEST_PROJECT_ID,
    );
    expect(photos).toEqual([]);
  });

  it("skips non-image files", async () => {
    const dir = await createTempDir();
    try {
      await writeFile(path.join(dir, ".gitkeep"), "");
      await writeFile(path.join(dir, ".DS_Store"), "junk");
      await writeFile(path.join(dir, "notes.txt"), "hello");
      await writeFile(path.join(dir, "valid.png"), TINY_PNG);

      const photos = await scanPhotos(dir, TEST_PROJECT_ID);
      expect(photos).toHaveLength(1);
      expect(photos[0].fileName).toBe("valid.png");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("produces deterministic UUIDs", async () => {
    const dir = await createTempDir();
    try {
      await writeFile(path.join(dir, "photo.png"), TINY_PNG);
      const photos1 = await scanPhotos(dir, TEST_PROJECT_ID);
      const photos2 = await scanPhotos(dir, TEST_PROJECT_ID);
      expect(photos1[0].id).toBe(photos2[0].id);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("all results validate against PhotoSchema", async () => {
    const dir = await createTempDir();
    try {
      await writeFile(path.join(dir, "a.png"), TINY_PNG);
      await writeFile(path.join(dir, "b.jpg"), TINY_JPEG);

      const photos = await scanPhotos(dir, TEST_PROJECT_ID);
      expect(photos.length).toBeGreaterThanOrEqual(1);
      for (const photo of photos) {
        expect(() => PhotoSchema.parse(photo)).not.toThrow();
      }
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("handles multiple image types", async () => {
    const dir = await createTempDir();
    try {
      await writeFile(path.join(dir, "image.png"), TINY_PNG);
      await writeFile(path.join(dir, "image.jpg"), TINY_JPEG);

      const photos = await scanPhotos(dir, TEST_PROJECT_ID);
      expect(photos).toHaveLength(2);

      const names = photos.map((p) => p.fileName).sort();
      expect(names).toEqual(["image.jpg", "image.png"]);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("populates hash field on every photo", async () => {
    const dir = await createTempDir();
    try {
      await writeFile(path.join(dir, "a.png"), TINY_PNG);
      await writeFile(path.join(dir, "b.jpg"), TINY_JPEG);

      const photos = await scanPhotos(dir, TEST_PROJECT_ID);
      for (const photo of photos) {
        expect(photo.hash).toBeDefined();
        expect(photo.hash).toMatch(/^[0-9a-f]{64}$/);
      }
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("assigns the same hash to files with identical content", async () => {
    const dir = await createTempDir();
    try {
      await writeFile(path.join(dir, "copy1.png"), TINY_PNG);
      await writeFile(path.join(dir, "copy2.png"), TINY_PNG);

      const photos = await scanPhotos(dir, TEST_PROJECT_ID);
      expect(photos).toHaveLength(2);
      expect(photos[0].hash).toBe(photos[1].hash);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
