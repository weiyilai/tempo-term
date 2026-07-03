import { describe, expect, it } from "vitest";
import { applyTerminalPadding } from "./terminalPadding";

describe("applyTerminalPadding", () => {
  it("sets equal padding in pixels on the given element", () => {
    const el = document.createElement("div");
    applyTerminalPadding(el, 24);
    expect(el.style.padding).toBe("24px");
  });

  it("makes the xterm viewport transparent so it doesn't paint over the padding gutter", () => {
    // xterm.js's own .xterm-viewport child is absolutely positioned with
    // inset: 0, which resolves against the *padding* edge of this element,
    // so it always covers the full box regardless of the padding we set
    // above. Its default background (xterm.css's static #000 fallback) is
    // never themed, so left alone it paints a black ring over the padding
    // gutter in every theme. See terminalPadding.ts for the full write-up.
    const el = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.className = "xterm-viewport";
    viewport.style.backgroundColor = "rgb(0, 0, 0)";
    el.appendChild(viewport);

    applyTerminalPadding(el, 24);

    expect(viewport.style.backgroundColor).toBe("transparent");
  });
});
