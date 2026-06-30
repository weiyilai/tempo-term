import { useEffect, useMemo } from "react";
import { progressKey, useProgressStore } from "@/modules/claude-progress/lib/progressStore";
import type { AgentKind } from "@/modules/claude-progress/lib/codexNormalize";
import { useTitlesStore, type TitleTarget } from "./titlesStore";

/** Caller-facing target: just cwd + agent. The epoch is stamped inside the hook. */
export interface VisibleSession {
  cwd: string;
  agent: AgentKind;
}

/**
 * Fetches the auto session title for each visible session (cwd + agent), and
 * refetches one when its session epoch changes (a new session starts), so titles
 * track the latest transcript.
 *
 * The whole visible set is handed to the store as a single batched call, so:
 *   - sessions whose cached epoch already matches are skipped (no IPC)
 *   - N successful fetches collapse into one store update, not N re-renders
 * Per-target failures are swallowed by the store.
 */
export function useWorkspaceTitles(targets: VisibleSession[]): void {
  const epochs = useProgressStore((s) => s.sessionEpochs);
  const refresh = useTitlesStore((s) => s.refresh);

  // Dedupe by session key and stamp each session's current epoch.
  const enriched = useMemo<TitleTarget[]>(() => {
    const seen = new Set<string>();
    const out: TitleTarget[] = [];
    for (const t of targets) {
      const key = progressKey(t.cwd, t.agent);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({ cwd: t.cwd, agent: t.agent, epoch: epochs[key] ?? 0 });
    }
    out.sort((a, b) =>
      progressKey(a.cwd, a.agent).localeCompare(progressKey(b.cwd, b.agent)),
    );
    return out;
  }, [targets, epochs]);

  // Stable string key so the effect only re-fires when the set or an epoch changes.
  const depKey = enriched
    .map((t) => `${progressKey(t.cwd, t.agent)}@${t.epoch}`)
    .join("\n");

  useEffect(() => {
    if (enriched.length === 0) {
      return;
    }
    void refresh(enriched);
    // `enriched` is already encoded in depKey; depending on it directly would
    // refetch on every render because WorkspacePanel rebuilds the array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, refresh]);
}
