import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatusSummary } from "@/components/status-summary";

afterEach(cleanup);

describe("StatusSummary", () => {
  it("displays the correct counts", () => {
    render(
      <StatusSummary
        total={28}
        kept={5}
        discarded={3}
        maybe={2}
        unreviewed={18}
      />,
    );
    const summary = screen.getByTestId("status-summary");
    expect(summary).toHaveTextContent("28 photos");
    expect(summary).toHaveTextContent("5 kept");
    expect(summary).toHaveTextContent("2 maybe");
    expect(summary).toHaveTextContent("3 discarded");
    expect(summary).toHaveTextContent("18 to review");
  });

  it("displays zero counts correctly", () => {
    render(
      <StatusSummary
        total={0}
        kept={0}
        discarded={0}
        maybe={0}
        unreviewed={0}
      />,
    );
    const summary = screen.getByTestId("status-summary");
    expect(summary).toHaveTextContent("0 photos");
    expect(summary).toHaveTextContent("0 kept");
    expect(summary).toHaveTextContent("0 maybe");
    expect(summary).toHaveTextContent("0 discarded");
    expect(summary).toHaveTextContent("0 to review");
  });
});
