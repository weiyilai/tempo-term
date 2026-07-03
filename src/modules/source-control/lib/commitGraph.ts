import {
  computeGraphLayout,
  type GraphGeometry,
  type GraphLayout,
  type GraphLayoutCommit,
} from "@/modules/git-graph/lib/graphLayout";
import type { CommitInfo } from "./gitBridge";

/**
 * Compact geometry for the sidebar's inline history graph — a fraction of the
 * full Git Graph tab's lane width and row height so the panel never feels
 * wide or heavy (issue #126 explicitly scopes this out of a full graph view).
 */
export const HISTORY_GRAPH_GEOMETRY: GraphGeometry = {
  laneWidth: 10,
  rowHeight: 24,
  paddingLeft: 4,
  paddingTop: 12,
  maxLane: 2,
};

/** Adapts the sidebar's flat commit list into the shared graph-layout algorithm. */
export function computeHistoryGraphLayout(commits: readonly CommitInfo[]): GraphLayout {
  const nodes: GraphLayoutCommit[] = commits.map((commit) => ({
    hash: commit.id,
    parents: commit.parents,
  }));
  return computeGraphLayout(nodes, HISTORY_GRAPH_GEOMETRY);
}
