import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Photo } from "@/schemas";
import { PhotoCard } from "@/components/photo-card";

afterEach(cleanup);

const basePhoto: Photo = {
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
};

describe("PhotoCard", () => {
  it("renders the photo filename", () => {
    render(
      <PhotoCard
        photo={basePhoto}
        onStatusChange={vi.fn()}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("sunset.jpg")).toBeInTheDocument();
  });

  it("renders an image with the correct alt text", () => {
    render(
      <PhotoCard
        photo={basePhoto}
        onStatusChange={vi.fn()}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByAltText("sunset.jpg")).toBeInTheDocument();
  });

  it("shows Keep badge when status is keep", () => {
    const keepPhoto = { ...basePhoto, status: "keep" as const };
    render(
      <PhotoCard
        photo={keepPhoto}
        onStatusChange={vi.fn()}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Keep")).toBeInTheDocument();
  });

  it("shows Discard badge when status is discard", () => {
    const discardPhoto = { ...basePhoto, status: "discard" as const };
    render(
      <PhotoCard
        photo={discardPhoto}
        onStatusChange={vi.fn()}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Discard")).toBeInTheDocument();
  });

  it("calls onClick when card is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PhotoCard
        photo={basePhoto}
        onStatusChange={vi.fn()}
        onClick={onClick}
      />,
    );
    await user.click(screen.getByTestId("photo-card"));
    expect(onClick).toHaveBeenCalledWith(basePhoto.id);
  });

  it("calls onStatusChange with 'keep' when keep button is clicked", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <PhotoCard
        photo={basePhoto}
        onStatusChange={onStatusChange}
        onClick={vi.fn()}
      />,
    );
    await user.click(screen.getByLabelText("Keep photo"));
    expect(onStatusChange).toHaveBeenCalledWith(basePhoto.id, "keep");
  });

  it("calls onStatusChange with 'discard' when discard button is clicked", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <PhotoCard
        photo={basePhoto}
        onStatusChange={onStatusChange}
        onClick={vi.fn()}
      />,
    );
    await user.click(screen.getByLabelText("Discard photo"));
    expect(onStatusChange).toHaveBeenCalledWith(basePhoto.id, "discard");
  });

  it("toggles keep back to unreviewed when already kept", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const keepPhoto = { ...basePhoto, status: "keep" as const };
    render(
      <PhotoCard
        photo={keepPhoto}
        onStatusChange={onStatusChange}
        onClick={vi.fn()}
      />,
    );
    await user.click(screen.getByLabelText("Keep photo"));
    expect(onStatusChange).toHaveBeenCalledWith(basePhoto.id, "unreviewed");
  });

  it("shows Maybe badge when status is maybe", () => {
    const maybePhoto = { ...basePhoto, status: "maybe" as const };
    render(
      <PhotoCard
        photo={maybePhoto}
        onStatusChange={vi.fn()}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Maybe")).toBeInTheDocument();
  });

  it("calls onStatusChange with 'maybe' when maybe button is clicked", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <PhotoCard
        photo={basePhoto}
        onStatusChange={onStatusChange}
        onClick={vi.fn()}
      />,
    );
    await user.click(screen.getByLabelText("Maybe photo"));
    expect(onStatusChange).toHaveBeenCalledWith(basePhoto.id, "maybe");
  });

  it("toggles maybe back to unreviewed when already maybe", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const maybePhoto = { ...basePhoto, status: "maybe" as const };
    render(
      <PhotoCard
        photo={maybePhoto}
        onStatusChange={onStatusChange}
        onClick={vi.fn()}
      />,
    );
    await user.click(screen.getByLabelText("Maybe photo"));
    expect(onStatusChange).toHaveBeenCalledWith(basePhoto.id, "unreviewed");
  });

  it("shows file removed placeholder when fileExists is false", () => {
    const removedPhoto = { ...basePhoto, fileExists: false };
    render(
      <PhotoCard
        photo={removedPhoto}
        onStatusChange={vi.fn()}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("File removed")).toBeInTheDocument();
    expect(screen.queryByAltText("sunset.jpg")).not.toBeInTheDocument();
  });

  it("still shows action buttons when file is removed", () => {
    const removedPhoto = { ...basePhoto, fileExists: false };
    render(
      <PhotoCard
        photo={removedPhoto}
        onStatusChange={vi.fn()}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Keep photo")).toBeInTheDocument();
    expect(screen.getByLabelText("Discard photo")).toBeInTheDocument();
    expect(screen.getByLabelText("Maybe photo")).toBeInTheDocument();
  });

  it("does not propagate click from action buttons to card onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PhotoCard
        photo={basePhoto}
        onStatusChange={vi.fn()}
        onClick={onClick}
      />,
    );
    await user.click(screen.getByLabelText("Keep photo"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
