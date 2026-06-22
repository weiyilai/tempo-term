import type { CommitNode } from "../types";

/**
 * Whether HEAD currently points at this commit, i.e. it is the checked-out
 * commit. The backend tags such a commit with a `head` ref for both an attached
 * HEAD (`HEAD -> branch`) and a detached HEAD (a bare `HEAD`).
 */
export function isCurrentCommit(commit: CommitNode): boolean {
  return commit.refs.some((ref) => ref.kind === "head");
}
