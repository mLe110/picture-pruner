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
    perceptualHash: "perceptual_hash",
  },
}));

import { db } from "@/db";
import { GET } from "@/app/api/projects/[projectId]/similar/route";

const mockedDb = vi.mocked(db);

function makeParams(projectId: string) {
  return { params: Promise.resolve({ projectId }) };
}

function makeRequest(projectId: string, threshold?: number) {
  const url = threshold
    ? `http://localhost/api/projects/${projectId}/similar?threshold=${threshold}`
    : `http://localhost/api/projects/${projectId}/similar`;
  return new NextRequest(url);
}

const now = new Date("2025-01-15T10:00:00Z");

function makeDbPhoto(
  id: string,
  fileName: string,
  perceptualHash: string | null,
) {
  return {
    id,
    projectId: "p1",
    fileName,
    filePath: `/photos/${fileName}`,
    width: 1920,
    height: 1080,
    fileSizeBytes: 500000,
    mimeType: "image/jpeg",
    hash: "contenthash",
    perceptualHash,
    status: "unreviewed",
    fileExists: true,
    importedAt: now,
    takenAt: null,
    updatedAt: now,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockSelectReturning(rows: unknown[]) {
  const whereMock = vi.fn().mockResolvedValue(rows);
  const fromMock = vi.fn().mockReturnValue({ where: whereMock });
  mockedDb.select.mockReturnValue({ from: fromMock } as never);
}

describe("GET /api/projects/[projectId]/similar", () => {
  it("returns empty groups when fewer than 2 photos have perceptual hashes", async () => {
    mockSelectReturning([
      makeDbPhoto("id-1", "photo1.jpg", "0000000000000000"),
    ]);

    const response = await GET(makeRequest("p1"), makeParams("p1"));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.groups).toEqual([]);
    expect(data.totalSimilarPhotos).toBe(0);
  });

  it("returns empty groups when no photos are similar", async () => {
    // Maximally different hashes: 64 bits apart
    mockSelectReturning([
      makeDbPhoto("id-1", "a.jpg", "0000000000000000"),
      makeDbPhoto("id-2", "b.jpg", "ffffffffffffffff"),
    ]);

    const response = await GET(makeRequest("p1"), makeParams("p1"));
    const data = await response.json();

    expect(data.groups).toEqual([]);
    expect(data.totalSimilarPhotos).toBe(0);
  });

  it("groups similar photos together", async () => {
    // Identical hashes → definitely similar
    mockSelectReturning([
      makeDbPhoto("id-1", "a.jpg", "abcdef0123456789"),
      makeDbPhoto("id-2", "b.jpg", "abcdef0123456789"),
    ]);

    const response = await GET(makeRequest("p1"), makeParams("p1"));
    const data = await response.json();

    expect(data.groups).toHaveLength(1);
    expect(data.groups[0].groupId).toBe(0);
    expect(data.groups[0].photos).toHaveLength(2);
    expect(data.totalSimilarPhotos).toBe(2);
  });

  it("respects custom threshold query parameter", async () => {
    // These differ by 8 bits (00ff = 8 set bits)
    mockSelectReturning([
      makeDbPhoto("id-1", "a.jpg", "0000000000000000"),
      makeDbPhoto("id-2", "b.jpg", "00000000000000ff"),
    ]);

    // Threshold 5: too strict, should NOT group
    const response1 = await GET(makeRequest("p1", 5), makeParams("p1"));
    const data1 = await response1.json();
    expect(data1.groups).toHaveLength(0);

    // Reset mock for second call
    mockSelectReturning([
      makeDbPhoto("id-1", "a.jpg", "0000000000000000"),
      makeDbPhoto("id-2", "b.jpg", "00000000000000ff"),
    ]);

    // Threshold 10: should group
    const response2 = await GET(makeRequest("p1", 10), makeParams("p1"));
    const data2 = await response2.json();
    expect(data2.groups).toHaveLength(1);
  });

  it("handles multiple distinct similar groups", async () => {
    mockSelectReturning([
      makeDbPhoto("id-1", "a.jpg", "0000000000000000"),
      makeDbPhoto("id-2", "b.jpg", "0000000000000000"),
      makeDbPhoto("id-3", "c.jpg", "ffffffffffffffff"),
      makeDbPhoto("id-4", "d.jpg", "ffffffffffffffff"),
    ]);

    const response = await GET(makeRequest("p1"), makeParams("p1"));
    const data = await response.json();

    expect(data.groups).toHaveLength(2);
    expect(data.totalSimilarPhotos).toBe(4);
  });
});
