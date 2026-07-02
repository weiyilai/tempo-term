import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function hoverAnchor() {
    fireEvent.mouseEnter(screen.getByRole("button").parentElement!);
  }

  it("shows the label only after the delay elapses", () => {
    render(
      <Tooltip label="Close">
        <button type="button">x</button>
      </Tooltip>,
    );
    hoverAnchor();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Close");
  });

  it("cancels the pending tooltip when the pointer leaves early", () => {
    render(
      <Tooltip label="Close">
        <button type="button">x</button>
      </Tooltip>,
    );
    hoverAnchor();
    fireEvent.mouseLeave(screen.getByRole("button").parentElement!);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("hides on mousedown so click-opened popovers are not covered", () => {
    render(
      <Tooltip label="More">
        <button type="button">x</button>
      </Tooltip>,
    );
    hoverAnchor();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("button"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("appends className to the wrapper", () => {
    render(
      <Tooltip label="hint" className="min-w-0 flex-1">
        <button type="button">x</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button").parentElement).toHaveClass(
      "inline-flex",
      "min-w-0",
      "flex-1",
    );
  });

  it("never shows a tooltip for a falsy label", () => {
    render(
      <Tooltip label={undefined}>
        <button type="button">x</button>
      </Tooltip>,
    );
    hoverAnchor();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
