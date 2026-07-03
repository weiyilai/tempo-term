/**
 * @xterm/addon-fit reads padding off the terminal's own root element (the
 * `.xterm` div xterm.js creates), not off its wrapping container. Applying
 * padding to the wrong element leaves the fit calculation unaware of it, so
 * the terminal overflows the container's right/bottom edges while the
 * top/left inset (a side effect of normal box-model flow) looks correct.
 */
export function applyTerminalPadding(element: HTMLElement, paddingPx: number): void {
  element.style.padding = `${paddingPx}px`;
  neutralizeViewportBackground(element);
}

/**
 * xterm.js's own `.xterm-viewport` child is absolutely positioned with
 * `inset: 0` (see @xterm/xterm's css/xterm.css), which CSS resolves against
 * the *padding* edge of its positioned ancestor (this element), not the
 * content edge. So the viewport always covers this element's full box,
 * completely ignoring the padding set above. Its own background-color is
 * xterm.css's static `#000` fallback and is never themed — xterm.js only
 * themes the `.xterm-scrollable-element` div nested inside it, which (being
 * in normal flow) does respect the padding. Left alone, that paints a
 * `paddingPx`-wide black ring over the padding gutter in every app theme,
 * dark or light. Making the viewport transparent lets the wrapping
 * container's own themed background (set in TerminalView) show through
 * instead, so the gutter reads as intended breathing room, not a
 * mismatched black frame.
 */
function neutralizeViewportBackground(element: HTMLElement): void {
  const viewport = element.querySelector<HTMLElement>(".xterm-viewport");
  if (viewport) {
    viewport.style.backgroundColor = "transparent";
  }
}
