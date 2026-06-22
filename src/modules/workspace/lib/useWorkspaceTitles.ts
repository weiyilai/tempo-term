import { useEffect } from "react";
import {
  parseProgressKey,
  progressKey,
  useProgressStore,
} from "@/modules/claude-progress/lib/progressStore";
import type { AgentKind } from "@/modules/claude-progress/lib/codexNormalize";
import { useTitlesStore } from "./titlesStore";

/** One session whose auto title we want kept fresh. */
export interface TitleTarget {
  cwd: string;
  agent: AgentKind;
}

/**
 * Fetches the auto session title for each visible session (cwd + agent), and
 * refetches one when its session epoch changes (a new session starts), so titles
 * track the latest transcript. Failures are swallowed by the store.
 */
export function useWorkspaceTitles(targets: TitleTarget[]): void {
  const epochs = useProgressStore((s) => s.sessionEpochs);
  const refresh = useTitlesStore((s) => s.refresh);
  // Dedupe to one entry per session and fold in each session's epoch, so a reset
  // triggers exactly one refetch for it.
  const keys = [...new Set(targets.map((t) => progressKey(t.cwd, t.agent)))].sort();
  const key = keys.map((k) => `${k}@${epochs[k] ?? 0}`).join("\n");

  useEffect(() => {
    if (!key) {
      return;
    }
    for (const entry of key.split("\n")) {
      const sessionKey = entry.slice(0, entry.lastIndexOf("@"));
      const { cwd, agent } = parseProgressKey(sessionKey);
      void refresh(cwd, agent);
    }
  }, [key, refresh]);
}
