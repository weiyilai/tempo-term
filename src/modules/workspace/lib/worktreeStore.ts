import { create } from "zustand";
import { gitWorktreeInfo, type WorktreeInfo } from "./worktreeBridge";
import { probeStoreUpdate } from "@/lib/perfProbe";

/**
 * Re-fetch a cwd's worktree info at most this often during mount-time refreshes,
 * to avoid an IPC storm every time the sidebar re-mounts WorkspacePanel. Focus
 * refreshes pass force=true to bypass this.
 */
const STALE_MS = 60_000;

interface WorktreeStoreState {
  /** Branch/worktree context per directory (keyed by cwd). */
  infos: Record<string, WorktreeInfo>;
  /** Wall-clock time of each cwd's last successful fetch (Date.now()). */
  fetchedAt: Record<string, number>;
  setInfo: (cwd: string, info: WorktreeInfo) => void;
  /**
   * Fetch and cache worktree info for each cwd; failures are ignored. Skips
   * any cwd whose cache is younger than `STALE_MS` unless `force` is true
   * (focus refresh). All successful fetches collapse into ONE store update so
   * subscribers re-render once, not N times.
   */
  refresh: (cwds: string[], force?: boolean) => Promise<void>;
}

export const useWorktreeStore = create<WorktreeStoreState>((set, get) => ({
  infos: {},
  fetchedAt: {},

  setInfo: (cwd, info) =>
    set((state) => ({ infos: { ...state.infos, [cwd]: info } })),

  refresh: async (cwds, force = false) => {
    const now = Date.now();
    const { fetchedAt } = get();
    const targets = force
      ? cwds
      : cwds.filter((cwd) => now - (fetchedAt[cwd] ?? 0) >= STALE_MS);
    if (targets.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      targets.map(async (cwd) => ({ cwd, info: await gitWorktreeInfo(cwd) })),
    );

    const fetched: Array<{ cwd: string; info: WorktreeInfo }> = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        fetched.push(r.value);
      }
      // A directory may not be a git repo, or the backend may be absent in
      // tests/web preview; leave any previous value untouched for that cwd.
    }
    if (fetched.length === 0) {
      return;
    }

    set((state) => {
      const nextInfos = { ...state.infos };
      const nextAt = { ...state.fetchedAt };
      for (const { cwd, info } of fetched) {
        nextInfos[cwd] = info;
        nextAt[cwd] = now;
      }
      probeStoreUpdate("worktree");
      return { infos: nextInfos, fetchedAt: nextAt };
    });
  },
}));
