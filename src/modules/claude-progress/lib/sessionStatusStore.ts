import { create } from "zustand";
import type { SessionStatus } from "./sessionStatus";
import type { AgentKind } from "./codexNormalize";

interface SessionStatusState {
  /** Live agent status per terminal leaf id; absence means no badge. */
  statuses: Record<string, SessionStatus>;
  /**
   * Which agent (Claude or Codex) is running in each terminal leaf, derived from
   * the pane's foreground process. Lets a card label each pane's session even
   * when two panes share one directory.
   */
  agents: Record<string, AgentKind>;
  setStatus: (leafId: string, status: SessionStatus) => void;
  setAgent: (leafId: string, agent: AgentKind) => void;
  clear: (leafId: string) => void;
}

export const useSessionStatusStore = create<SessionStatusState>((set) => ({
  statuses: {},
  agents: {},
  setStatus: (leafId, status) =>
    set((s) => ({ statuses: { ...s.statuses, [leafId]: status } })),
  setAgent: (leafId, agent) =>
    set((s) =>
      s.agents[leafId] === agent ? s : { agents: { ...s.agents, [leafId]: agent } },
    ),
  clear: (leafId) =>
    set((s) => {
      if (!(leafId in s.statuses) && !(leafId in s.agents)) {
        return s;
      }
      const statuses = { ...s.statuses };
      delete statuses[leafId];
      const agents = { ...s.agents };
      delete agents[leafId];
      return { statuses, agents };
    }),
}));
