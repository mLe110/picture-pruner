import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import type { Photo } from "@/schemas";
import { PhotoLightbox } from "@/components/photo-lightbox";

afterEach(cleanup);

const photo: Photo = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  projectId: "660e8400-e29b-41d4-a716-446655440000",
  fileName: "sunset.jpg",
  filePath: "/data/input/sunset.jpg",
  width: 1920,
  height: 1080,
  fileSizeBytes: 2_500_000,
  mimeType: "image/jpeg",
  status: "unreviewed",
  fileExists: true,
  importedAt: "2025-01-15T10:00:00Z",
  takenAt: "2024-12-25T08:00:00Z",
};

const defaultProps = {
  onClose: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onStatusChange: vi.fn(),
  hasPrev: true,
  hasNext: true,
};

describe("PhotoLightbox", () => {
  it("renders photo metadata when open", () => {
    render(<PhotoLightbox photo={photo} {...defaultProps} />);
    const metadata = screen.getByTestId("lightbox-metadata");
    expect(metadata).toHaveTextContent("sunset.jpg");
    expect(metadata).toHaveTextContent("1920");
    expect(metadata).toHaveTextContent("1080");
    expect(metadata).toHaveTextContent("2.4 MB");
  });

  it("renders the full-size image", () => {
    render(<PhotoLightbox photo={photo} {...defaultProps} />);
    expect(screen.getByAltText("sunset.jpg")).toBeInTheDocument();
  });

  it("shows navigation arrows when hasPrev and hasNext", () => {
    render(<PhotoLightbox photo={photo} {...defaultProps} />);
    expect(screen.getByLabelText("Previous photo")).toBeInTheDocument();
    expect(screen.getByLabelText("Next photo")).toBeInTheDocument();
  });

  it("hides prev arrow when hasPrev is false", () => {
    render(<PhotoLightbox photo={photo} {...defaultProps} hasPrev={false} />);
    expect(screen.queryByLabelText("Previous photo")).not.toBeInTheDocument();
  });

  it("navigates with keyboard arrow keys", async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <PhotoLightbox
        photo={photo}
        {...defaultProps}
        onPrev={onPrev}
        onNext={onNext}
      />,
    );
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    });
    expect(onPrev).toHaveBeenCalled();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });
    expect(onNext).toHaveBeenCalled();
  });

  it("toggles keep with 'k' key and advances to next", async () => {
    const onStatusChange = vi.fn();
    const onNext = vi.fn();
    render(
      <PhotoLightbox
        photo={photo}
        {...defaultProps}
        onStatusChange={onStatusChange}
        onNext={onNext}
      />,
    );
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    });
    expect(onStatusChange).toHaveBeenCalledWith(photo.id, "keep");
    expect(onNext).toHaveBeenCalled();
  });

  it("toggles discard with 'd' key and advances to next", async () => {
    const onStatusChange = vi.fn();
    const onNext = vi.fn();
    render(
      <PhotoLightbox
        photo={photo}
        {...defaultProps}
        onStatusChange={onStatusChange}
        onNext={onNext}
      />,
    );
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    });
    expect(onStatusChange).toHaveBeenCalledWith(photo.id, "discard");
    expect(onNext).toHaveBeenCalled();
  });

  it("does not advance when toggling keep back to unreviewed", async () => {
    const onStatusChange = vi.fn();
    const onNext = vi.fn();
    const keptPhoto = { ...photo, status: "keep" as const };
    render(
      <PhotoLightbox
        photo={keptPhoto}
        {...defaultProps}
        onStatusChange={onStatusChange}
        onNext={onNext}
      />,
    );
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    });
    expect(onStatusChange).toHaveBeenCalledWith(photo.id, "unreviewed");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("does not advance when toggling discard back to unreviewed", async () => {
    const onStatusChange = vi.fn();
    const onNext = vi.fn();
    const discardedPhoto = { ...photo, status: "discard" as const };
    render(
      <PhotoLightbox
        photo={discardedPhoto}
        {...defaultProps}
        onStatusChange={onStatusChange}
        onNext={onNext}
      />,
    );
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    });
    expect(onStatusChange).toHaveBeenCalledWith(photo.id, "unreviewed");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("does not advance when there is no next photo", async () => {
    const onStatusChange = vi.fn();
    const onNext = vi.fn();
    render(
      <PhotoLightbox
        photo={photo}
        {...defaultProps}
        onStatusChange={onStatusChange}
        onNext={onNext}
        hasNext={false}
      />,
    );
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    });
    expect(onStatusChange).toHaveBeenCalledWith(photo.id, "keep");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("toggles maybe with 'm' key and advances to next", async () => {
    const onStatusChange = vi.fn();
    const onNext = vi.fn();
    render(
      <PhotoLightbox
        photo={photo}
        {...defaultProps}
        onStatusChange={onStatusChange}
        onNext={onNext}
      />,
    );
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "m" }));
    });
    expect(onStatusChange).toHaveBeenCalledWith(photo.id, "maybe");
    expect(onNext).toHaveBeenCalled();
  });

  it("does not advance when toggling maybe back to unreviewed", async () => {
    const onStatusChange = vi.fn();
    const onNext = vi.fn();
    const maybePhoto = { ...photo, status: "maybe" as const };
    render(
      <PhotoLightbox
        photo={maybePhoto}
        {...defaultProps}
        onStatusChange={onStatusChange}
        onNext={onNext}
      />,
    );
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "m" }));
    });
    expect(onStatusChange).toHaveBeenCalledWith(photo.id, "unreviewed");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("shows file removed placeholder when fileExists is false", () => {
    const removedPhoto = { ...photo, fileExists: false };
    render(<PhotoLightbox photo={removedPhoto} {...defaultProps} />);
    expect(screen.getByText("File no longer on disk")).toBeInTheDocument();
    expect(screen.queryByAltText("sunset.jpg")).not.toBeInTheDocument();
  });

  it("does not render when photo is null", () => {
    render(<PhotoLightbox photo={null} {...defaultProps} />);
    expect(screen.queryByTestId("lightbox-metadata")).not.toBeInTheDocument();
  });
});
