import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorktreeStore } from "./worktreeStore";
import { gitWorktreeInfo, type WorktreeInfo } from "./worktreeBridge";

vi.mock("./worktreeBridge", () => ({
  gitWorktreeInfo: vi.fn(),
}));

const mockInfo: WorktreeInfo = {
  branch: "main",
  cwd: "/a",
  isWorktree: false,
  mainBranch: null,
  mainPath: null,
};

beforeEach(() => {
  useWorktreeStore.setState({ infos: {}, fetchedAt: {} });
  vi.mocked(gitWorktreeInfo).mockReset();
});

describe("worktreeStore", () => {
  it("caches fetched worktree info by cwd", async () => {
    vi.mocked(gitWorktreeInfo).mockResolvedValue(mockInfo);
    await useWorktreeStore.getState().refresh(["/a"]);
    expect(useWorktreeStore.getState().infos["/a"]).toEqual(mockInfo);
  });

  it("leaves the cache untouched when a fetch fails", async () => {
    useWorktreeStore.setState({ infos: { "/a": mockInfo } });
    vi.mocked(gitWorktreeInfo).mockRejectedValue(new Error("not a repo"));
    await useWorktreeStore.getState().refresh(["/a"]);
    expect(useWorktreeStore.getState().infos["/a"]).toEqual(mockInfo);
  });

  it("skips invoking the bridge for entries fetched within the stale window", async () => {
    vi.mocked(gitWorktreeInfo).mockResolvedValue(mockInfo);
    await useWorktreeStore.getState().refresh(["/a"]);
    vi.mocked(gitWorktreeInfo).mockClear();
    // Second refresh well within the 60s stale window — must be a no-op.
    await useWorktreeStore.getState().refresh(["/a"]);
    expect(gitWorktreeInfo).not.toHaveBeenCalled();
  });

  it("forces a refetch when force=true even if the cache is fresh", async () => {
    vi.mocked(gitWorktreeInfo).mockResolvedValue(mockInfo);
    await useWorktreeStore.getState().refresh(["/a"]);
    vi.mocked(gitWorktreeInfo).mockClear();
    await useWorktreeStore.getState().refresh(["/a"], true);
    expect(gitWorktreeInfo).toHaveBeenCalledTimes(1);
  });

  it("only fetches the entries that are actually stale, leaving fresh ones alone", async () => {
    vi.mocked(gitWorktreeInfo).mockResolvedValue(mockInfo);
    await useWorktreeStore.getState().refresh(["/a"]);
    vi.mocked(gitWorktreeInfo).mockClear();
    await useWorktreeStore.getState().refresh(["/a", "/b"]);
    expect(gitWorktreeInfo).toHaveBeenCalledTimes(1);
    expect(gitWorktreeInfo).toHaveBeenCalledWith("/b");
  });

  it("batches all newly fetched cwds into a single store update", async () => {
    vi.mocked(gitWorktreeInfo).mockImplementation(async (cwd: string) => ({
      ...mockInfo,
      cwd,
    }));
    let setCount = 0;
    const unsub = useWorktreeStore.subscribe(() => {
      setCount += 1;
    });
    await useWorktreeStore.getState().refresh(["/a", "/b", "/c"]);
    unsub();
    // Three fetches must collapse into one store update, not three.
    expect(setCount).toBe(1);
    const { infos } = useWorktreeStore.getState();
    expect(infos["/a"]?.cwd).toBe("/a");
    expect(infos["/b"]?.cwd).toBe("/b");
    expect(infos["/c"]?.cwd).toBe("/c");
  });
});
