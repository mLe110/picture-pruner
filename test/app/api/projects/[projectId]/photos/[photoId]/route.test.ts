import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db", () => {
  const mockDb = {
    update: vi.fn(),
  };
  return { db: mockDb };
});

vi.mock("@/db/schema", () => ({
  photos: { id: "id", status: "status" },
}));

import { db } from "@/db";
import { PATCH } from "@/app/api/projects/[projectId]/photos/[photoId]/route";

const mockedDb = vi.mocked(db);

beforeEach(() => {
  vi.restoreAllMocks();
});

function makeParams(projectId: string, photoId: string) {
  return { params: Promise.resolve({ projectId, photoId }) };
}

describe("PATCH /api/projects/[projectId]/photos/[photoId]", () => {
  it("returns 400 for invalid JSON", async () => {
    const request = new NextRequest(
      "http://localhost/api/projects/p1/photos/ph1",
      { method: "PATCH", body: "not json" },
    );
    const response = await PATCH(request, makeParams("p1", "ph1"));
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 400 for missing status field", async () => {
    const request = new NextRequest(
      "http://localhost/api/projects/p1/photos/ph1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    const response = await PATCH(request, makeParams("p1", "ph1"));
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Missing status field");
  });

  it("returns 400 for invalid status value", async () => {
    const request = new NextRequest(
      "http://localhost/api/projects/p1/photos/ph1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid" }),
      },
    );
    const response = await PATCH(request, makeParams("p1", "ph1"));
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid status value");
  });

  it("returns 404 when photo not found", async () => {
    const returningMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.update.mockReturnValue({ set: setMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/p1/photos/ph1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "keep" }),
      },
    );
    const response = await PATCH(request, makeParams("p1", "ph1"));
    expect(response.status).toBe(404);
  });

  it("returns updated photo on success", async () => {
    const updatedPhoto = {
      id: "ph1",
      projectId: "p1",
      fileName: "test.jpg",
      filePath: "/photos/test.jpg",
      width: 1920,
      height: 1080,
      fileSizeBytes: 1000000,
      mimeType: "image/jpeg",
      hash: null,
      status: "keep",
      fileExists: true,
      importedAt: new Date("2025-01-15T10:00:00Z"),
      takenAt: null,
      updatedAt: new Date("2025-01-15T10:00:00Z"),
    };

    const returningMock = vi.fn().mockResolvedValue([updatedPhoto]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.update.mockReturnValue({ set: setMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/p1/photos/ph1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "keep" }),
      },
    );
    const response = await PATCH(request, makeParams("p1", "ph1"));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("keep");
    expect(data.fileName).toBe("test.jpg");
  });

  it("accepts maybe as a valid status", async () => {
    const updatedPhoto = {
      id: "ph1",
      projectId: "p1",
      fileName: "test.jpg",
      filePath: "/photos/test.jpg",
      width: 1920,
      height: 1080,
      fileSizeBytes: 1000000,
      mimeType: "image/jpeg",
      hash: null,
      status: "maybe",
      fileExists: true,
      importedAt: new Date("2025-01-15T10:00:00Z"),
      takenAt: null,
      updatedAt: new Date("2025-01-15T10:00:00Z"),
    };

    const returningMock = vi.fn().mockResolvedValue([updatedPhoto]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.update.mockReturnValue({ set: setMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/p1/photos/ph1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "maybe" }),
      },
    );
    const response = await PATCH(request, makeParams("p1", "ph1"));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("maybe");
  });
});
