import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiffView } from "./DiffView";
import type { DiffLine } from "./types";

function makeLines(n: number): DiffLine[] {
  return Array.from({ length: n }, (_, i) => ({
    kind: "context" as const,
    text: `line-${i}`,
  }));
}

describe("DiffView", () => {
  it("shows the empty label when there are no lines", () => {
    render(<DiffView lines={[]} emptyLabel="nothing here" />);
    expect(screen.getByText("nothing here")).toBeInTheDocument();
  });

  it("renders only a window of rows for a large diff", () => {
    render(<DiffView lines={makeLines(500)} emptyLabel="empty" />);

    // The top of the diff is mounted...
    expect(screen.getByText("line-0")).toBeInTheDocument();
    // ...but rows far below the viewport are virtualized away.
    expect(screen.queryByText("line-499")).not.toBeInTheDocument();
    expect(screen.queryByText("line-300")).not.toBeInTheDocument();
  });

  it("reserves full scroll height so the scrollbar reflects the whole diff", () => {
    const { container } = render(
      <DiffView lines={makeLines(100)} emptyLabel="empty" />,
    );
    // 100 rows * 20px per row.
    const spacer = container.querySelector<HTMLElement>("div[style*='height']");
    expect(spacer?.style.height).toBe("2000px");
  });
});
