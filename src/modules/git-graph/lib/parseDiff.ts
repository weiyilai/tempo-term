import type { DiffLine } from "../types";

/**
 * Parse a unified diff string into classified lines for rendering. A trailing
 * newline is dropped so it does not produce an empty last line. The +++ / ---
 * file-header check runs before the single +/- check so headers are not mistaken
 * for additions or deletions.
 */
export function parseDiffLines(diff: string): DiffLine[] {
  if (diff === "") {
    return [];
  }
  const body = diff.endsWith("\n") ? diff.slice(0, -1) : diff;
  return body.split("\n").map((line): DiffLine => {
    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("new file") ||
      line.startsWith("deleted file") ||
      line.startsWith("similarity") ||
      line.startsWith("rename ")
    ) {
      return { kind: "meta", text: line };
    }
    if (line.startsWith("+++") || line.startsWith("---")) {
      return { kind: "file", text: line };
    }
    if (line.startsWith("@@")) {
      return { kind: "hunk", text: line };
    }
    if (line.startsWith("+")) {
      return { kind: "add", text: line };
    }
    if (line.startsWith("-")) {
      return { kind: "del", text: line };
    }
    return { kind: "context", text: line };
  });
}
