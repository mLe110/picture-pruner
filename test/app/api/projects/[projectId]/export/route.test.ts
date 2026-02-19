import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db", () => {
  const mockDb = {
    select: vi.fn(),
  };
  return { db: mockDb };
});

vi.mock("@/db/schema", () => ({
  projects: { id: "id", outputDir: "output_dir" },
  photos: {
    projectId: "project_id",
    status: "status",
    fileExists: "file_exists",
    fileName: "file_name",
    filePath: "file_path",
  },
}));

vi.mock("@/lib/photo-export", () => ({
  exportPhotos: vi.fn(),
}));

import { db } from "@/db";
import { exportPhotos } from "@/lib/photo-export";
import { POST } from "@/app/api/projects/[projectId]/export/route";

const mockedDb = vi.mocked(db);
const mockedExportPhotos = vi.mocked(exportPhotos);

beforeEach(() => {
  vi.restoreAllMocks();
});

function makeParams(projectId: string) {
  return { params: Promise.resolve({ projectId }) };
}

describe("POST /api/projects/[projectId]/export", () => {
  it("returns 404 when project not found", async () => {
    const limitMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.select.mockReturnValue({ from: fromMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/nonexistent/export",
      {
        method: "POST",
      },
    );
    const response = await POST(request, makeParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("returns 400 when project has no outputDir", async () => {
    const mockProject = {
      id: "proj-1",
      name: "Test",
      inputDir: "/input",
      outputDir: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const limitMock = vi.fn().mockResolvedValue([mockProject]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.select.mockReturnValue({ from: fromMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/proj-1/export",
      {
        method: "POST",
      },
    );
    const response = await POST(request, makeParams("proj-1"));
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Project has no output directory configured");
  });

  it("returns 400 when outputDir does not exist on disk", async () => {
    const mockProject = {
      id: "proj-1",
      name: "Test",
      inputDir: "/input",
      outputDir: "/nonexistent/output/path/that/should/not/exist",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const limitMock = vi.fn().mockResolvedValue([mockProject]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockedDb.select.mockReturnValue({ from: fromMock } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/proj-1/export",
      {
        method: "POST",
      },
    );
    const response = await POST(request, makeParams("proj-1"));
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe(
      "Output directory does not exist on the filesystem",
    );
  });

  it("returns zero counts when no keep photos exist", async () => {
    const mockProject = {
      id: "proj-1",
      name: "Test",
      inputDir: "/input",
      outputDir: "/tmp",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // First call: project lookup, second call: photos query
    const limitMock = vi.fn().mockResolvedValue([mockProject]);
    const whereMock1 = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock1 = vi.fn().mockReturnValue({ where: whereMock1 });

    const whereMock2 = vi.fn().mockResolvedValue([]);
    const fromMock2 = vi.fn().mockReturnValue({ where: whereMock2 });

    mockedDb.select
      .mockReturnValueOnce({ from: fromMock1 } as never)
      .mockReturnValueOnce({ from: fromMock2 } as never);

    const request = new NextRequest(
      "http://localhost/api/projects/proj-1/export",
      {
        method: "POST",
      },
    );
    const response = await POST(request, makeParams("proj-1"));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ exported: 0, skipped: 0, failed: 0, total: 0 });
  });

  it("exports keep photos and returns counts", async () => {
    const mockProject = {
      id: "proj-1",
      name: "Test",
      inputDir: "/input",
      outputDir: "/tmp",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const keepPhotos = [
      { fileName: "a.jpg", filePath: "/input/a.jpg" },
      { fileName: "b.jpg", filePath: "/input/b.jpg" },
    ];

    const limitMock = vi.fn().mockResolvedValue([mockProject]);
    const whereMock1 = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock1 = vi.fn().mockReturnValue({ where: whereMock1 });

    const whereMock2 = vi.fn().mockResolvedValue(keepPhotos);
    const fromMock2 = vi.fn().mockReturnValue({ where: whereMock2 });

    mockedDb.select
      .mockReturnValueOnce({ from: fromMock1 } as never)
      .mockReturnValueOnce({ from: fromMock2 } as never);

    mockedExportPhotos.mockResolvedValue({
      exported: 1,
      skipped: 1,
      failed: 0,
    });

    const request = new NextRequest(
      "http://localhost/api/projects/proj-1/export",
      {
        method: "POST",
      },
    );
    const response = await POST(request, makeParams("proj-1"));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ exported: 1, skipped: 1, failed: 0, total: 2 });
    expect(mockedExportPhotos).toHaveBeenCalledWith(keepPhotos, "/tmp");
  });
});
