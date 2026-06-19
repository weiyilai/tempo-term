import { describe, expect, it } from "vitest";
import { dropRestoredPrefix, trimScrollback } from "./terminalHistory";

describe("trimScrollback", () => {
  it("keeps only the last N lines when the text is longer", () => {
    const text = ["a", "b", "c", "d", "e"].join("\n");
    expect(trimScrollback(text, 3)).toBe("c\nd\ne");
  });

  it("returns the text unchanged when it has at most N lines", () => {
    expect(trimScrollback("a\nb", 5)).toBe("a\nb");
    expect(trimScrollback("", 5)).toBe("");
  });
});

describe("dropRestoredPrefix", () => {
  it("drops the restored read-only lines and keeps only this session's output", () => {
    const buffer = ["old line 1", "old line 2", "── previous session ──", "live 1", "live 2"].join(
      "\n",
    );
    // 3 restored lines = 2 saved history lines + the separator.
    expect(dropRestoredPrefix(buffer, 3)).toBe("live 1\nlive 2");
  });

  it("returns the text unchanged when nothing was restored", () => {
    expect(dropRestoredPrefix("live 1\nlive 2", 0)).toBe("live 1\nlive 2");
  });

  it("returns empty when the live shell has produced no output yet", () => {
    const buffer = ["old line 1", "── previous session ──"].join("\n");
    expect(dropRestoredPrefix(buffer, 2)).toBe("");
  });

  it("returns empty when the buffer was cleared below the restored prefix", () => {
    // A `clear`/reset shrinks the buffer; there is no live output to keep, and
    // we must never re-emit the restored block.
    expect(dropRestoredPrefix("something", 5)).toBe("");
  });

  it("does not multiply restored history across repeated reopen cycles", () => {
    // Simulate reopening a pane N times. Each cycle:
    //   1. restore: prepend the saved history + a "previous session" separator
    //   2. shell prints one fresh live line
    //   3. snapshot: serialize the whole buffer, then strip the restored prefix
    // The persisted file must stay a single session's worth of output, never
    // an ever-growing stack of duplicated history.
    const separator = "── previous session ──";
    let saved = "";
    for (let i = 0; i < 5; i += 1) {
      const restoredLines = saved === "" ? [] : [...saved.split("\n"), separator];
      const restoredCount = restoredLines.length;
      const liveLine = `live ${i}`;
      const fullBuffer = [...restoredLines, liveLine].join("\n");
      saved = dropRestoredPrefix(fullBuffer, restoredCount);
    }
    expect(saved).toBe("live 4");
    expect(saved.split("\n").filter((line) => line === separator)).toHaveLength(0);
  });
});
