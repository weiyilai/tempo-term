import { beforeEach, describe, expect, it, vi } from "vitest";
import { progressKey } from "@/modules/claude-progress/lib/progressStore";
import { claudeSessionTitle, codexSessionTitle } from "./titlesBridge";

vi.mock("./titlesBridge", () => ({
  claudeSessionTitle: vi.fn(async () => "Claude title"),
  codexSessionTitle: vi.fn(async () => "Codex title"),
}));

import { useTitlesStore } from "./titlesStore";

beforeEach(() => {
  useTitlesStore.setState({ titles: {}, fetchedEpochs: {} });
  vi.mocked(claudeSessionTitle).mockClear();
  vi.mocked(codexSessionTitle).mockClear();
});

describe("titlesStore", () => {
  it("keys a Claude and a Codex title for the same cwd separately", async () => {
    await useTitlesStore.getState().refresh([
      { cwd: "/p", agent: "claude", epoch: 0 },
      { cwd: "/p", agent: "codex", epoch: 0 },
    ]);

    const { titles } = useTitlesStore.getState();
    expect(titles[progressKey("/p", "claude")]).toBe("Claude title");
    expect(titles[progressKey("/p", "codex")]).toBe("Codex title");
  });

  it("skips bridge calls for targets already fetched at the same epoch", async () => {
    await useTitlesStore.getState().refresh([{ cwd: "/p", agent: "claude", epoch: 1 }]);
    vi.mocked(claudeSessionTitle).mockClear();
    await useTitlesStore.getState().refresh([{ cwd: "/p", agent: "claude", epoch: 1 }]);
    expect(claudeSessionTitle).not.toHaveBeenCalled();
  });

  it("refetches a target when its epoch changes (new session started)", async () => {
    await useTitlesStore.getState().refresh([{ cwd: "/p", agent: "claude", epoch: 1 }]);
    vi.mocked(claudeSessionTitle).mockClear();
    await useTitlesStore.getState().refresh([{ cwd: "/p", agent: "claude", epoch: 2 }]);
    expect(claudeSessionTitle).toHaveBeenCalledTimes(1);
  });

  it("collapses multiple title fetches into a single store update", async () => {
    let setCount = 0;
    const unsub = useTitlesStore.subscribe(() => {
      setCount += 1;
    });
    await useTitlesStore.getState().refresh([
      { cwd: "/a", agent: "claude", epoch: 0 },
      { cwd: "/b", agent: "claude", epoch: 0 },
      { cwd: "/c", agent: "codex", epoch: 0 },
    ]);
    unsub();
    // Three fetches must collapse into one store update, not three.
    expect(setCount).toBe(1);
    const { titles } = useTitlesStore.getState();
    expect(titles[progressKey("/a", "claude")]).toBe("Claude title");
    expect(titles[progressKey("/b", "claude")]).toBe("Claude title");
    expect(titles[progressKey("/c", "codex")]).toBe("Codex title");
  });

  it("still caches successful titles when another fetch in the batch fails", async () => {
    vi.mocked(claudeSessionTitle).mockImplementation(async (cwd: string) => {
      if (cwd === "/bad") throw new Error("no transcript");
      return "Claude title";
    });
    await useTitlesStore.getState().refresh([
      { cwd: "/good", agent: "claude", epoch: 0 },
      { cwd: "/bad", agent: "claude", epoch: 0 },
    ]);
    const { titles } = useTitlesStore.getState();
    expect(titles[progressKey("/good", "claude")]).toBe("Claude title");
    expect(titles[progressKey("/bad", "claude")]).toBeUndefined();
  });
});
