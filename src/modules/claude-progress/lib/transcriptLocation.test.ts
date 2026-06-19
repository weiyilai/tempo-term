import { describe, expect, it } from "vitest";
import { transcriptDirForCwd } from "./transcriptLocation";

describe("transcriptDirForCwd", () => {
  it("maps a working directory to its Claude projects transcript dir", () => {
    // Claude Code mangles the cwd by replacing every non-alphanumeric character
    // with a dash (verified against a real ~/.claude/projects path).
    expect(
      transcriptDirForCwd("/Users/muki/Documents/01.project/tempo-term", "/Users/muki"),
    ).toBe("/Users/muki/.claude/projects/-Users-muki-Documents-01-project-tempo-term");
  });

  it("dashes out dots and underscores too", () => {
    expect(transcriptDirForCwd("/a/b_c.d", "/home/x")).toBe(
      "/home/x/.claude/projects/-a-b-c-d",
    );
  });
});
