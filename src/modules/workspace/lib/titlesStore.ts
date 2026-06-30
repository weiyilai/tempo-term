import { create } from "zustand";
import { progressKey } from "@/modules/claude-progress/lib/progressStore";
import type { AgentKind } from "@/modules/claude-progress/lib/codexNormalize";
import { claudeSessionTitle, codexSessionTitle } from "./titlesBridge";
import { probeStoreUpdate } from "@/lib/perfProbe";

/** One session whose auto title we want kept fresh. */
export interface TitleTarget {
  cwd: string;
  agent: AgentKind;
  /**
   * Caller-provided session epoch. Used to invalidate the cache: when a new
   * session starts the epoch bumps and we refetch this target. Targets whose
   * cached epoch already matches are skipped entirely (no IPC).
   */
  epoch: number;
}

interface TitlesStoreState {
  /** Auto session title per session, keyed by `progressKey(cwd, agent)`. */
  titles: Record<string, string>;
  /** Last successfully fetched epoch per session key. */
  fetchedEpochs: Record<string, number>;
  /**
   * Fetch and cache titles for a batch of sessions. Targets whose cached epoch
   * already matches `target.epoch` are skipped (no IPC). All successful fetches
   * collapse into ONE store update so subscribers re-render once, not N times.
   * Missing titles or errors are ignored per-target.
   */
  refresh: (targets: TitleTarget[]) => Promise<void>;
}

async function fetchTitle(target: TitleTarget): Promise<string | null> {
  try {
    if (target.agent === "codex") {
      return (await codexSessionTitle(target.cwd)) ?? null;
    }
    return (await claudeSessionTitle(target.cwd)) ?? null;
  } catch {
    // No transcript yet, or no backend in tests/web preview; keep last value.
    return null;
  }
}

export const useTitlesStore = create<TitlesStoreState>((set, get) => ({
  titles: {},
  fetchedEpochs: {},

  refresh: async (targets) => {
    const { fetchedEpochs } = get();
    const stale = targets.filter(
      (t) => fetchedEpochs[progressKey(t.cwd, t.agent)] !== t.epoch,
    );
    if (stale.length === 0) {
      return;
    }

    const results = await Promise.all(
      stale.map(async (target) => ({ target, title: await fetchTitle(target) })),
    );

    const fetched = results.filter(
      (r): r is { target: TitleTarget; title: string } => r.title !== null,
    );
    if (fetched.length === 0) {
      return;
    }

    set((state) => {
      const nextTitles = { ...state.titles };
      const nextEpochs = { ...state.fetchedEpochs };
      for (const { target, title } of fetched) {
        const key = progressKey(target.cwd, target.agent);
        nextTitles[key] = title;
        nextEpochs[key] = target.epoch;
      }
      probeStoreUpdate("title");
      return { titles: nextTitles, fetchedEpochs: nextEpochs };
    });
  },
}));
