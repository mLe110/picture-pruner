import { describe, expect, it } from "vitest";
import { computeSyncDiff } from "@/lib/sync-diff";
import type { Photo } from "@/schemas";

const PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";

function makePhoto(fileName: string, id?: string): Photo {
  return {
    id: id ?? `id-${fileName}`,
    projectId: PROJECT_ID,
    fileName,
    filePath: `/photos/${fileName}`,
    width: 1920,
    height: 1080,
    fileSizeBytes: 1_000_000,
    mimeType: "image/jpeg",
    status: "unreviewed",
    fileExists: true,
    importedAt: "2025-01-15T10:00:00Z",
  };
}

describe("computeSyncDiff", () => {
  it("identifies new files to insert", () => {
    const fsPhotos = [makePhoto("a.jpg"), makePhoto("b.jpg")];
    const dbPhotos = [{ id: "id-a.jpg", fileName: "a.jpg", fileExists: true }];

    const diff = computeSyncDiff(fsPhotos, dbPhotos);

    expect(diff.toInsert).toHaveLength(1);
    expect(diff.toInsert[0].fileName).toBe("b.jpg");
    expect(diff.toRemove).toHaveLength(0);
    expect(diff.toRestore).toHaveLength(0);
  });

  it("identifies removed files", () => {
    const fsPhotos = [makePhoto("a.jpg")];
    const dbPhotos = [
      { id: "id-a.jpg", fileName: "a.jpg", fileExists: true },
      { id: "id-b.jpg", fileName: "b.jpg", fileExists: true },
    ];

    const diff = computeSyncDiff(fsPhotos, dbPhotos);

    expect(diff.toInsert).toHaveLength(0);
    expect(diff.toRemove).toEqual(["id-b.jpg"]);
    expect(diff.toRestore).toHaveLength(0);
  });

  it("identifies re-appeared files to restore", () => {
    const fsPhotos = [makePhoto("a.jpg"), makePhoto("b.jpg")];
    const dbPhotos = [
      { id: "id-a.jpg", fileName: "a.jpg", fileExists: true },
      { id: "id-b.jpg", fileName: "b.jpg", fileExists: false },
    ];

    const diff = computeSyncDiff(fsPhotos, dbPhotos);

    expect(diff.toInsert).toHaveLength(0);
    expect(diff.toRemove).toHaveLength(0);
    expect(diff.toRestore).toEqual(["id-b.jpg"]);
  });

  it("handles all three cases simultaneously", () => {
    const fsPhotos = [
      makePhoto("existing.jpg"),
      makePhoto("new.jpg"),
      makePhoto("restored.jpg"),
    ];
    const dbPhotos = [
      { id: "id-existing.jpg", fileName: "existing.jpg", fileExists: true },
      { id: "id-removed.jpg", fileName: "removed.jpg", fileExists: true },
      { id: "id-restored.jpg", fileName: "restored.jpg", fileExists: false },
    ];

    const diff = computeSyncDiff(fsPhotos, dbPhotos);

    expect(diff.toInsert).toHaveLength(1);
    expect(diff.toInsert[0].fileName).toBe("new.jpg");
    expect(diff.toRemove).toEqual(["id-removed.jpg"]);
    expect(diff.toRestore).toEqual(["id-restored.jpg"]);
  });

  it("is idempotent when no changes", () => {
    const fsPhotos = [makePhoto("a.jpg"), makePhoto("b.jpg")];
    const dbPhotos = [
      { id: "id-a.jpg", fileName: "a.jpg", fileExists: true },
      { id: "id-b.jpg", fileName: "b.jpg", fileExists: true },
    ];

    const diff = computeSyncDiff(fsPhotos, dbPhotos);

    expect(diff.toInsert).toHaveLength(0);
    expect(diff.toRemove).toHaveLength(0);
    expect(diff.toRestore).toHaveLength(0);
  });

  it("does not try to remove already-removed files", () => {
    const fsPhotos: Photo[] = [];
    const dbPhotos = [{ id: "id-a.jpg", fileName: "a.jpg", fileExists: false }];

    const diff = computeSyncDiff(fsPhotos, dbPhotos);

    expect(diff.toRemove).toHaveLength(0);
  });

  it("handles empty filesystem and empty DB", () => {
    const diff = computeSyncDiff([], []);

    expect(diff.toInsert).toHaveLength(0);
    expect(diff.toRemove).toHaveLength(0);
    expect(diff.toRestore).toHaveLength(0);
  });

  it("handles all new files (empty DB)", () => {
    const fsPhotos = [makePhoto("a.jpg"), makePhoto("b.jpg")];

    const diff = computeSyncDiff(fsPhotos, []);

    expect(diff.toInsert).toHaveLength(2);
    expect(diff.toRemove).toHaveLength(0);
    expect(diff.toRestore).toHaveLength(0);
  });
});
