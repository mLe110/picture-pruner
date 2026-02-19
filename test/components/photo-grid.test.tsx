import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { Photo } from "@/schemas";
import { PhotoGrid } from "@/components/photo-grid";

afterEach(cleanup);

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    projectId: "660e8400-e29b-41d4-a716-446655440000",
    fileName: "photo.jpg",
    filePath: "/data/input/photo.jpg",
    width: 1920,
    height: 1080,
    fileSizeBytes: 1_000_000,
    mimeType: "image/jpeg",
    status: "unreviewed",
    fileExists: true,
    importedAt: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("PhotoGrid", () => {
  it("renders the correct number of photo cards", () => {
    const photos = [
      makePhoto({ id: "550e8400-e29b-41d4-a716-446655440001" }),
      makePhoto({ id: "550e8400-e29b-41d4-a716-446655440002" }),
      makePhoto({ id: "550e8400-e29b-41d4-a716-446655440003" }),
    ];
    render(
      <PhotoGrid
        photos={photos}
        onStatusChange={vi.fn()}
        onPhotoClick={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId("photo-card")).toHaveLength(3);
  });

  it("shows empty state when no photos", () => {
    render(
      <PhotoGrid photos={[]} onStatusChange={vi.fn()} onPhotoClick={vi.fn()} />,
    );
    expect(screen.getByText("No photos to display")).toBeInTheDocument();
  });
});
