import { create } from "zustand";
import { progressKey } from "@/modules/claude-progress/lib/progressStore";
import type { AgentKind } from "@/modules/claude-progress/lib/codexNormalize";
import { claudeSessionTitle, codexSessionTitle } from "./titlesBridge";

interface TitlesStoreState {
  /** Auto session title per session, keyed by `progressKey(cwd, agent)`. */
  titles: Record<string, string>;
  /**
   * Fetch and cache the title for one cwd+agent session. The agent picks the
   * source (Claude vs Codex transcripts); a missing title or error is ignored.
   */
  refresh: (cwd: string, agent: AgentKind) => Promise<void>;
}

export const useTitlesStore = create<TitlesStoreState>((set) => ({
  titles: {},

  refresh: async (cwd, agent) => {
    try {
      const title =
        agent === "codex" ? await codexSessionTitle(cwd) : await claudeSessionTitle(cwd);
      if (title) {
        set((state) => ({ titles: { ...state.titles, [progressKey(cwd, agent)]: title } }));
      }
    } catch {
      // No transcript yet, or no backend in tests/web preview; keep last value.
    }
  },
}));
