import { describe, expect, it } from "vitest";
import { isCurrentCommit } from "./currentCommit";
import type { CommitNode, CommitRef } from "../types";

function commit(refs: CommitRef[]): CommitNode {
  return { hash: "abc1234", parents: [], author: "a", date: "d", message: "m", refs };
}

describe("isCurrentCommit", () => {
  it("is true when a checked-out branch head points at the commit", () => {
    expect(isCurrentCommit(commit([{ name: "master", kind: "head" }]))).toBe(true);
  });

  it("is true on a detached HEAD", () => {
    expect(isCurrentCommit(commit([{ name: "HEAD", kind: "head" }]))).toBe(true);
  });

  it("is false for a commit carrying only branch, tag, or remote refs", () => {
    expect(
      isCurrentCommit(
        commit([
          { name: "origin/master", kind: "remote" },
          { name: "v1.0", kind: "tag" },
          { name: "feature", kind: "branch" },
        ]),
      ),
    ).toBe(false);
  });

  it("is false when the commit has no refs", () => {
    expect(isCurrentCommit(commit([]))).toBe(false);
  });
});
