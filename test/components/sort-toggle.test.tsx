import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SortToggle } from "@/components/sort-toggle";

afterEach(cleanup);

describe("SortToggle", () => {
  it("renders 'Newest first' when direction is desc", () => {
    render(<SortToggle direction="desc" onToggle={vi.fn()} />);
    expect(screen.getByText("Newest first")).toBeInTheDocument();
  });

  it("renders 'Oldest first' when direction is asc", () => {
    render(<SortToggle direction="asc" onToggle={vi.fn()} />);
    expect(screen.getByText("Oldest first")).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SortToggle direction="desc" onToggle={onToggle} />);
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
