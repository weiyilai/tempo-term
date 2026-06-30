// TEMP PERF PROBE — remove after diagnosing the workspace-switch jank.
//
// Measures the main-thread cost of switching back to the Workspaces panel:
//   - how long the thread is blocked (gaps between animation frames; a big gap
//     means frames could not be served, i.e. the thread was busy)
//   - how many times TabCard re-renders during the window
//   - which stores drive those re-renders
//
// Frame gaps are used instead of the Long Tasks API because WKWebView (the Tauri
// webview on macOS) does not support `longtask` PerformanceObserver entries.

const WINDOW_MS = 3000;

interface ProbeState {
  startedAt: number;
  lastFrame: number;
  firstFrameGap: number;
  maxFrameGap: number;
  jankMs: number;
  frames: number;
  cardRenders: number;
  storeUpdates: Record<string, number>;
  rafId: number;
  timer: ReturnType<typeof setTimeout>;
}

let state: ProbeState | null = null;

function isDev(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

/** Begin a measurement window. Call the instant the user clicks to switch. */
export function probeStart(): void {
  if (!isDev()) {
    return;
  }
  if (state) {
    cancelAnimationFrame(state.rafId);
    clearTimeout(state.timer);
  }
  const now = performance.now();
  const s: ProbeState = {
    startedAt: now,
    lastFrame: now,
    firstFrameGap: 0,
    maxFrameGap: 0,
    jankMs: 0,
    frames: 0,
    cardRenders: 0,
    storeUpdates: {},
    rafId: 0,
    timer: setTimeout(probeSummary, WINDOW_MS),
  };
  const tick = (frameNow: number) => {
    const gap = frameNow - s.lastFrame;
    s.lastFrame = frameNow;
    s.frames += 1;
    if (s.frames === 1) {
      s.firstFrameGap = gap;
    }
    if (gap > s.maxFrameGap) {
      s.maxFrameGap = gap;
    }
    if (gap > 50) {
      s.jankMs += gap;
    }
    if (frameNow - s.startedAt < WINDOW_MS) {
      s.rafId = requestAnimationFrame(tick);
    }
  };
  s.rafId = requestAnimationFrame(tick);
  state = s;
}

/** Count one TabCard render. */
export function probeCardRender(): void {
  if (state) {
    state.cardRenders += 1;
  }
}

/** Count one store update that produces a new state (and so a re-render). */
export function probeStoreUpdate(store: string): void {
  if (state) {
    state.storeUpdates[store] = (state.storeUpdates[store] ?? 0) + 1;
  }
}

function probeSummary(): void {
  if (!state) {
    return;
  }
  const s = state;
  state = null;
  cancelAnimationFrame(s.rafId);
  const elapsed = performance.now() - s.startedAt;
  const updates =
    Object.entries(s.storeUpdates)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ") || "(none)";
  // eslint-disable-next-line no-console
  console.log(
    `[perf] workspace-switch over ${elapsed.toFixed(0)}ms\n` +
      `  first-render block:  ${s.firstFrameGap.toFixed(0)}ms (thread busy before the first frame after click)\n` +
      `  worst single block:  ${s.maxFrameGap.toFixed(0)}ms\n` +
      `  total jank (>50ms frames): ${s.jankMs.toFixed(0)}ms\n` +
      `  TabCard renders:     ${s.cardRenders}\n` +
      `  store updates:       ${updates}`,
  );
}
