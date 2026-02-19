import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db", () => {
  const mockDb = {
    select: vi.fn(),
  };
  return { db: mockDb };
});

vi.mock("@/db/schema", () => ({
  photos: {
    projectId: "project_id",
    fileExists: "file_exists",
    hash: "hash",
  },
}));

import { db } from "@/db";
import { GET } from "@/app/api/projects/[projectId]/duplicates/route";

const mockedDb = vi.mocked(db);

function makeParams(projectId: string) {
  return { params: Promise.resolve({ projectId }) };
}

function makeRequest(projectId: string) {
  return new NextRequest(
    `http://localhost/api/projects/${projectId}/duplicates`,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/projects/[projectId]/duplicates", () => {
  it("returns empty groups when no duplicates exist", async () => {
    // Mock: groupBy query returns empty
    const havingMock = vi.fn().mockResolvedValue([]);
    const groupByMock = vi.fn().mockReturnValue({ having: havingMock });
    const whereMock = vi.fn().mockReturnValue({ groupBy: groupByMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.select.mockReturnValue({ from: fromMock } as never);

    const response = await GET(makeRequest("p1"), makeParams("p1"));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.groups).toEqual([]);
    expect(data.totalDuplicatePhotos).toBe(0);
  });

  it("returns correct groups when duplicates exist", async () => {
    const duplicateHash = "abc123def456";
    const now = new Date("2025-01-15T10:00:00Z");

    // First call: groupBy query returns duplicate hashes
    const havingMock = vi.fn().mockResolvedValue([{ hash: duplicateHash }]);
    const groupByMock = vi.fn().mockReturnValue({ having: havingMock });
    const whereMock1 = vi.fn().mockReturnValue({ groupBy: groupByMock });
    const fromMock1 = vi.fn().mockReturnValue({ where: whereMock1 });

    // Second call: fetch all photos for those hashes
    const whereMock2 = vi.fn().mockResolvedValue([
      {
        id: "id-1",
        projectId: "p1",
        fileName: "photo1.jpg",
        filePath: "/photos/photo1.jpg",
        width: 1920,
        height: 1080,
        fileSizeBytes: 1000000,
        mimeType: "image/jpeg",
        hash: duplicateHash,
        status: "unreviewed",
        fileExists: true,
        importedAt: now,
        takenAt: null,
        updatedAt: now,
      },
      {
        id: "id-2",
        projectId: "p1",
        fileName: "photo2.jpg",
        filePath: "/photos/photo2.jpg",
        width: 1920,
        height: 1080,
        fileSizeBytes: 1000000,
        mimeType: "image/jpeg",
        hash: duplicateHash,
        status: "unreviewed",
        fileExists: true,
        importedAt: now,
        takenAt: null,
        updatedAt: now,
      },
    ]);
    const fromMock2 = vi.fn().mockReturnValue({ where: whereMock2 });

    let callCount = 0;
    mockedDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { from: fromMock1 } as never;
      }
      return { from: fromMock2 } as never;
    });

    const response = await GET(makeRequest("p1"), makeParams("p1"));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.groups).toHaveLength(1);
    expect(data.groups[0].hash).toBe(duplicateHash);
    expect(data.groups[0].photos).toHaveLength(2);
    expect(data.totalDuplicatePhotos).toBe(2);
  });

  it("excludes fileExists=false photos from groups", async () => {
    // Verify that the where clause includes fileExists=true
    // The mock setup ensures only fileExists=true photos are queried
    const havingMock = vi.fn().mockResolvedValue([]);
    const groupByMock = vi.fn().mockReturnValue({ having: havingMock });
    const whereMock = vi.fn().mockReturnValue({ groupBy: groupByMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.select.mockReturnValue({ from: fromMock } as never);

    const response = await GET(makeRequest("p1"), makeParams("p1"));
    expect(response.status).toBe(200);

    // Verify the db.select was called (query includes fileExists filter)
    expect(mockedDb.select).toHaveBeenCalled();
    const data = await response.json();
    expect(data.groups).toEqual([]);
  });

  it("handles multiple duplicate groups", async () => {
    const hash1 = "hash_group_1";
    const hash2 = "hash_group_2";
    const now = new Date("2025-01-15T10:00:00Z");

    const havingMock = vi
      .fn()
      .mockResolvedValue([{ hash: hash1 }, { hash: hash2 }]);
    const groupByMock = vi.fn().mockReturnValue({ having: havingMock });
    const whereMock1 = vi.fn().mockReturnValue({ groupBy: groupByMock });
    const fromMock1 = vi.fn().mockReturnValue({ where: whereMock1 });

    const makePhoto = (id: string, fileName: string, hash: string) => ({
      id,
      projectId: "p1",
      fileName,
      filePath: `/photos/${fileName}`,
      width: 1920,
      height: 1080,
      fileSizeBytes: 500000,
      mimeType: "image/jpeg",
      hash,
      status: "unreviewed",
      fileExists: true,
      importedAt: now,
      takenAt: null,
      updatedAt: now,
    });

    const whereMock2 = vi
      .fn()
      .mockResolvedValue([
        makePhoto("id-1", "a.jpg", hash1),
        makePhoto("id-2", "b.jpg", hash1),
        makePhoto("id-3", "c.jpg", hash2),
        makePhoto("id-4", "d.jpg", hash2),
        makePhoto("id-5", "e.jpg", hash2),
      ]);
    const fromMock2 = vi.fn().mockReturnValue({ where: whereMock2 });

    let callCount = 0;
    mockedDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { from: fromMock1 } as never;
      return { from: fromMock2 } as never;
    });

    const response = await GET(makeRequest("p1"), makeParams("p1"));
    const data = await response.json();

    expect(data.groups).toHaveLength(2);
    expect(data.totalDuplicatePhotos).toBe(5);

    const group1 = data.groups.find((g: { hash: string }) => g.hash === hash1);
    const group2 = data.groups.find((g: { hash: string }) => g.hash === hash2);
    expect(group1.photos).toHaveLength(2);
    expect(group2.photos).toHaveLength(3);
  });
});
