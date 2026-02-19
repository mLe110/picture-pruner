import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the db module before importing the route
vi.mock("@/db", () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
  };
  return { db: mockDb };
});

// Mock the schema module
vi.mock("@/db/schema", () => ({
  projects: { id: "id", name: "name" },
}));

import { db } from "@/db";
import { GET, POST } from "@/app/api/projects/route";

const mockedDb = vi.mocked(db);

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/projects", () => {
  it("returns a list of projects", async () => {
    const mockProjects = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Test Project",
        inputDir: "/photos/test",
        createdAt: new Date("2025-01-15T10:00:00Z"),
        updatedAt: new Date("2025-01-15T10:00:00Z"),
      },
    ];

    const fromMock = vi.fn().mockResolvedValue(mockProjects);
    mockedDb.select.mockReturnValue({ from: fromMock } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Test Project");
    expect(data[0].createdAt).toBe("2025-01-15T10:00:00.000Z");
  });

  it("returns empty array when no projects exist", async () => {
    const fromMock = vi.fn().mockResolvedValue([]);
    mockedDb.select.mockReturnValue({ from: fromMock } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
});

describe("POST /api/projects", () => {
  it("returns 400 for invalid JSON", async () => {
    const request = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: "not json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 400 for missing required fields", async () => {
    const request = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 when inputDir does not exist", async () => {
    const request = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        inputDir: "/nonexistent/path/that/should/not/exist",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("inputDir does not exist on the filesystem");
  });
});
