import { describe, expect, it } from "vitest";
import { computeHistoryGraphLayout, HISTORY_GRAPH_GEOMETRY } from "./commitGraph";
import type { CommitInfo } from "./gitBridge";

function commit(id: string, parents: string[]): CommitInfo {
  return { id, parents, summary: id, author: "Test", timestamp: 0 };
}

describe("computeHistoryGraphLayout", () => {
  it("keeps a linear history in a single lane", () => {
    const commits = [commit("c", ["b"]), commit("b", ["a"]), commit("a", [])];
    const { layouts } = computeHistoryGraphLayout(commits);

    expect(layouts.c.lane).toBe(0);
    expect(layouts.b.lane).toBe(0);
    expect(layouts.a.lane).toBe(0);
  });

  it("opens a second lane for a merge commit's extra parent", () => {
    const commits = [commit("m", ["a", "b"]), commit("b", ["a"]), commit("a", [])];
    const { layouts } = computeHistoryGraphLayout(commits);

    expect(layouts.m.lane).toBe(0);
    expect(layouts.b.lane).toBe(1);
  });

  it("positions rows using the compact geometry, not the full graph tab's", () => {
    const commits = [commit("b", ["a"]), commit("a", [])];
    const { layouts } = computeHistoryGraphLayout(commits);

    expect(layouts.b.y).toBe(HISTORY_GRAPH_GEOMETRY.paddingTop);
    expect(layouts.a.y).toBe(HISTORY_GRAPH_GEOMETRY.paddingTop + HISTORY_GRAPH_GEOMETRY.rowHeight);
  });

  it("produces one edge per parent link", () => {
    const commits = [commit("c", ["b"]), commit("b", ["a"]), commit("a", [])];
    const { edges } = computeHistoryGraphLayout(commits);

    expect(edges).toHaveLength(2);
  });

  it("ignores a parent hash that falls outside the loaded page", () => {
    const commits = [commit("only", ["missing-parent"])];
    const { edges } = computeHistoryGraphLayout(commits);

    expect(edges).toHaveLength(0);
  });
});
