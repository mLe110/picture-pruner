import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the db module before importing the route
vi.mock("@/db", () => {
  const mockDb = {
    select: vi.fn(),
    delete: vi.fn(),
  };
  return { db: mockDb };
});

// Mock the schema module
vi.mock("@/db/schema", () => ({
  projects: { id: "id" },
}));

import { db } from "@/db";
import { GET, DELETE } from "@/app/api/projects/[projectId]/route";

const mockedDb = vi.mocked(db);

beforeEach(() => {
  vi.restoreAllMocks();
});

function makeParams(projectId: string) {
  return { params: Promise.resolve({ projectId }) };
}

describe("GET /api/projects/[projectId]", () => {
  it("returns 404 when project not found", async () => {
    const limitMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.select.mockReturnValue({ from: fromMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/nonexistent",
    );
    const response = await GET(request, makeParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("returns a project when found", async () => {
    const mockProject = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test",
      inputDir: "/photos/test",
      createdAt: new Date("2025-01-15T10:00:00Z"),
      updatedAt: new Date("2025-01-15T10:00:00Z"),
    };

    const limitMock = vi.fn().mockResolvedValue([mockProject]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.select.mockReturnValue({ from: fromMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/550e8400-e29b-41d4-a716-446655440000",
    );
    const response = await GET(
      request,
      makeParams("550e8400-e29b-41d4-a716-446655440000"),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe("Test");
    expect(data.createdAt).toBe("2025-01-15T10:00:00.000Z");
  });
});

describe("DELETE /api/projects/[projectId]", () => {
  it("returns 404 when project not found", async () => {
    const returningMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    mockedDb.delete.mockReturnValue({ where: whereMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/nonexistent",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, makeParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("returns 204 on successful deletion", async () => {
    const returningMock = vi.fn().mockResolvedValue([{ id: "some-id" }]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    mockedDb.delete.mockReturnValue({ where: whereMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/550e8400-e29b-41d4-a716-446655440000",
      { method: "DELETE" },
    );
    const response = await DELETE(
      request,
      makeParams("550e8400-e29b-41d4-a716-446655440000"),
    );
    expect(response.status).toBe(204);
  });
});
