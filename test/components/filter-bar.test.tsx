import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "@/components/filter-bar";

afterEach(cleanup);

const defaultCounts = {
  all: 28,
  unreviewed: 20,
  keep: 5,
  discard: 3,
  maybe: 2,
};

describe("FilterBar", () => {
  it("renders all filter options with counts", () => {
    render(
      <FilterBar
        activeFilter="all"
        counts={defaultCounts}
        onFilterChange={vi.fn()}
      />,
    );
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getByText("Unreviewed")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("Keep")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Maybe")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Discard")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onFilterChange when a filter is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <FilterBar
        activeFilter="all"
        counts={defaultCounts}
        onFilterChange={onFilterChange}
      />,
    );
    await user.click(screen.getByText("Keep"));
    expect(onFilterChange).toHaveBeenCalledWith("keep");
  });

  it("calls onFilterChange with maybe when Maybe is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <FilterBar
        activeFilter="all"
        counts={defaultCounts}
        onFilterChange={onFilterChange}
      />,
    );
    await user.click(screen.getByText("Maybe"));
    expect(onFilterChange).toHaveBeenCalledWith("maybe");
  });
});
