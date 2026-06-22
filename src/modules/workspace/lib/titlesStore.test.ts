import { beforeEach, describe, expect, it, vi } from "vitest";
import { progressKey } from "@/modules/claude-progress/lib/progressStore";

vi.mock("./titlesBridge", () => ({
  claudeSessionTitle: vi.fn(async () => "Claude title"),
  codexSessionTitle: vi.fn(async () => "Codex title"),
}));

import { useTitlesStore } from "./titlesStore";

beforeEach(() => useTitlesStore.setState({ titles: {} }));

describe("titlesStore", () => {
  it("keys a Claude and a Codex title for the same cwd separately", async () => {
    await useTitlesStore.getState().refresh("/p", "claude");
    await useTitlesStore.getState().refresh("/p", "codex");

    const titles = useTitlesStore.getState().titles;
    expect(titles[progressKey("/p", "claude")]).toBe("Claude title");
    expect(titles[progressKey("/p", "codex")]).toBe("Codex title");
  });
});
