import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({
  invoke,
  Channel: class {
    onmessage: ((m: unknown) => void) | null = null;
  },
}));

import { closeLocalSessions, openPty } from "./pty-bridge";

const opts = { cols: 80, rows: 24, onData: () => {}, onExit: () => {} };

beforeEach(() => {
  invoke.mockReset();
});

describe("pty-bridge session registry", () => {
  it("closeLocalSessions closes every open session, then clears", async () => {
    invoke.mockResolvedValueOnce(1).mockResolvedValueOnce(2); // two pty_open ids
    await openPty(opts);
    await openPty(opts);

    invoke.mockResolvedValue(undefined);
    await closeLocalSessions();

    const closes = invoke.mock.calls.filter(([cmd]) => cmd === "pty_close");
    expect(closes.map(([, args]) => (args as { id: number }).id).sort()).toEqual([1, 2]);

    invoke.mockClear();
    await closeLocalSessions();
    expect(invoke).not.toHaveBeenCalled(); // registry was cleared
  });

  it("session.close() unregisters so closeLocalSessions does not re-close it", async () => {
    invoke.mockResolvedValueOnce(7);
    const session = await openPty(opts);

    invoke.mockResolvedValue(undefined);
    await session.close();
    invoke.mockClear();

    await closeLocalSessions();
    expect(invoke).not.toHaveBeenCalled();
  });
});
