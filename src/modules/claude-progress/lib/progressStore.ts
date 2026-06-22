import { create } from "zustand";
import { createNormalizer, type Normalizer } from "./normalize";
import { createCodexNormalizer, type AgentKind } from "./codexNormalize";
import { emptyProgressState, reduceProgress, type ProgressState } from "./progressState";

/**
 * The store key for one tracked session: a directory plus the agent running in
 * it. Keying by cwd alone collides when the same directory runs Claude in one
 * pane and Codex in another, so each agent gets its own slot. The agent name has
 * no colon, so splitting on the first colon recovers the full cwd.
 */
export function progressKey(cwd: string, agent: AgentKind): string {
  return `${agent}:${cwd}`;
}

/** Split a progress key back into its agent and cwd. */
export function parseProgressKey(key: string): { agent: AgentKind; cwd: string } {
  const sep = key.indexOf(":");
  return { agent: key.slice(0, sep) as AgentKind, cwd: key.slice(sep + 1) };
}

interface ProgressStoreState {
  /** Accumulated progress per tracked session, keyed by `progressKey(cwd, agent)`. */
  sessions: Record<string, ProgressState>;
  /**
   * A per-session counter bumped whenever that session resets (a new session in
   * the same cwd+agent slot). Consumers watch it to know when to refetch derived
   * data like the session title. Keyed by `progressKey(cwd, agent)`.
   */
  sessionEpochs: Record<string, number>;
  /**
   * Feed raw transcript lines (from the backend watcher) for one cwd. `reset`
   * marks the first batch of a newly started session, clearing prior progress.
   * `agent` selects both the normalizer and which session slot the lines land in,
   * so Claude and Codex in the same directory stay independent.
   */
  pushLines: (cwd: string, agent: AgentKind, lines: string[], reset: boolean) => void;
  /** Keep only the sessions whose cwd is in `cwds`; drop the rest. */
  syncSessions: (cwds: string[]) => void;
}

// Each session's normalizer is stateful (it pairs tool calls with their
// results), so the normalizers live alongside the store, one per session slot.
const normalizers = new Map<string, Normalizer>();

function makeNormalizer(agent: AgentKind): Normalizer {
  return agent === "codex" ? createCodexNormalizer() : createNormalizer();
}

function normalizerFor(key: string, agent: AgentKind): Normalizer {
  let normalizer = normalizers.get(key);
  if (!normalizer) {
    normalizer = makeNormalizer(agent);
    normalizers.set(key, normalizer);
  }
  return normalizer;
}

export const useProgressStore = create<ProgressStoreState>((set) => ({
  sessions: {},
  sessionEpochs: {},

  pushLines: (cwd, agent, lines, reset) =>
    set((state) => {
      const key = progressKey(cwd, agent);
      // A reset (new session) starts fresh so the old session's leftovers can't
      // linger. Each agent has its own slot, so there is no cross-agent reset.
      if (reset) {
        normalizers.set(key, makeNormalizer(agent));
      }
      const sessionEpochs = reset
        ? { ...state.sessionEpochs, [key]: (state.sessionEpochs[key] ?? 0) + 1 }
        : state.sessionEpochs;
      const normalizer = normalizerFor(key, agent);
      const previous = reset ? undefined : state.sessions[key];
      let next = previous ?? emptyProgressState();
      for (const line of lines) {
        for (const event of normalizer.push(line)) {
          next = reduceProgress(next, event);
        }
      }
      if (next === previous) {
        return { sessionEpochs };
      }
      // Don't materialize an empty session for a slot whose lines produced nothing.
      if (!reset && previous === undefined && isEmptyProgress(next)) {
        return { sessionEpochs };
      }
      return { sessions: { ...state.sessions, [key]: next }, sessionEpochs };
    }),

  syncSessions: (cwds) =>
    set((state) => {
      const keep = new Set(cwds);
      const kept = (key: string) => keep.has(parseProgressKey(key).cwd);
      for (const key of normalizers.keys()) {
        if (!kept(key)) {
          normalizers.delete(key);
        }
      }
      const sessions: Record<string, ProgressState> = {};
      for (const [key, progress] of Object.entries(state.sessions)) {
        if (kept(key)) {
          sessions[key] = progress;
        }
      }
      return { sessions };
    }),
}));

/** True when a session has nothing worth showing (no activities, subagents, or todos). */
export function isEmptyProgress(progress: ProgressState): boolean {
  return (
    progress.activities.length === 0 &&
    progress.subagents.length === 0 &&
    progress.todos.length === 0
  );
}
