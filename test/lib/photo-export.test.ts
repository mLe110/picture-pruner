import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockStat, mockCopyFile } = vi.hoisted(() => ({
  mockStat: vi.fn(),
  mockCopyFile: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    default: {
      ...actual,
      stat: mockStat,
      copyFile: mockCopyFile,
    },
    stat: mockStat,
    copyFile: mockCopyFile,
  };
});

import { exportPhotos } from "@/lib/photo-export";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("exportPhotos", () => {
  const photos = [
    { fileName: "photo1.jpg", filePath: "/input/photo1.jpg" },
    { fileName: "photo2.jpg", filePath: "/input/photo2.jpg" },
    { fileName: "photo3.jpg", filePath: "/input/photo3.jpg" },
  ];

  it("copies all photos when none exist in output", async () => {
    mockStat.mockRejectedValue(new Error("ENOENT"));
    mockCopyFile.mockResolvedValue(undefined);

    const result = await exportPhotos(photos, "/output");

    expect(result).toEqual({ exported: 3, skipped: 0, failed: 0 });
    expect(mockCopyFile).toHaveBeenCalledTimes(3);
    expect(mockCopyFile).toHaveBeenCalledWith(
      "/input/photo1.jpg",
      "/output/photo1.jpg",
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      "/input/photo2.jpg",
      "/output/photo2.jpg",
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      "/input/photo3.jpg",
      "/output/photo3.jpg",
    );
  });

  it("skips photos that already exist in output", async () => {
    mockStat.mockResolvedValue({ isFile: () => true });

    const result = await exportPhotos(photos, "/output");

    expect(result).toEqual({ exported: 0, skipped: 3, failed: 0 });
    expect(mockCopyFile).not.toHaveBeenCalled();
  });

  it("handles mix of new and existing photos", async () => {
    mockStat
      .mockResolvedValueOnce({ isFile: () => true }) // photo1 exists
      .mockRejectedValueOnce(new Error("ENOENT")) // photo2 new
      .mockRejectedValueOnce(new Error("ENOENT")); // photo3 new
    mockCopyFile.mockResolvedValue(undefined);

    const result = await exportPhotos(photos, "/output");

    expect(result).toEqual({ exported: 2, skipped: 1, failed: 0 });
    expect(mockCopyFile).toHaveBeenCalledTimes(2);
  });

  it("counts failed copies", async () => {
    mockStat.mockRejectedValue(new Error("ENOENT"));
    mockCopyFile
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("EACCES"))
      .mockResolvedValueOnce(undefined);

    const result = await exportPhotos(photos, "/output");

    expect(result).toEqual({ exported: 2, skipped: 0, failed: 1 });
  });

  it("returns zeros for empty photo list", async () => {
    const result = await exportPhotos([], "/output");

    expect(result).toEqual({ exported: 0, skipped: 0, failed: 0 });
    expect(mockStat).not.toHaveBeenCalled();
    expect(mockCopyFile).not.toHaveBeenCalled();
  });
});
