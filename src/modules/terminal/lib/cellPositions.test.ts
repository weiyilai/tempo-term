import { describe, expect, it } from "vitest";
import { buildCellPositions, type TerminalRow } from "./cellPositions";
import { gatherLogicalLine, type TerminalBufferLine } from "./cellPositions";

/** Build a row of single-width ASCII cells from a plain string. */
function asciiRow(y: number, text: string): TerminalRow {
  return {
    y,
    cells: [...text].map((ch) => ({ chars: ch, width: 1 })),
  };
}

describe("buildCellPositions", () => {
  it("maps an ASCII string index to the same 1-based column", () => {
    const { text, spans } = buildCellPositions([asciiRow(7, "abc")]);
    expect(text).toBe("abc");
    expect(spans[0]).toEqual({ startX: 1, endX: 1, y: 7 });
    expect(spans[2]).toEqual({ startX: 3, endX: 3, y: 7 });
  });

  it("accounts for the two columns a wide glyph occupies", () => {
    // xterm stores a wide glyph as a width-2 cell followed by a width-0 spacer.
    const row: TerminalRow = {
      y: 1,
      cells: [
        { chars: "文", width: 2 },
        { chars: "", width: 0 },
        { chars: "a", width: 1 },
      ],
    };
    const { text, spans } = buildCellPositions([row]);
    expect(text).toBe("文a");
    // The wide glyph spans columns 1-2...
    expect(spans[0]).toEqual({ startX: 1, endX: 2, y: 1 });
    // ...so the ASCII char after it sits at column 3, not 2.
    expect(spans[1]).toEqual({ startX: 3, endX: 3, y: 1 });
  });

  it("renders a never-written cell as a space so adjacent paths stay separate", () => {
    // A never-written cell is width 1 with empty chars (NULL_CELL_WIDTH = 1),
    // not a width-0 spacer; it must become a space, not be dropped, or two
    // paths either side of it would merge into one bogus token.
    const row: TerminalRow = {
      y: 1,
      cells: [
        { chars: "a", width: 1 },
        { chars: "", width: 1 },
        { chars: "b", width: 1 },
      ],
    };
    const { text, spans } = buildCellPositions([row]);
    expect(text).toBe("a b");
    expect(spans[2]).toEqual({ startX: 3, endX: 3, y: 1 });
  });

  it("continues onto a wrapped row with its own column origin", () => {
    const { text, spans } = buildCellPositions([
      asciiRow(4, "ab"),
      asciiRow(5, "cd"),
    ]);
    expect(text).toBe("abcd");
    // First char of the second row restarts at column 1 on line 5.
    expect(spans[2]).toEqual({ startX: 1, endX: 1, y: 5 });
    expect(spans[3]).toEqual({ startX: 2, endX: 2, y: 5 });
  });
});

function fakeLine(text: string, isWrapped: boolean): TerminalBufferLine {
  const chars = [...text];
  return {
    isWrapped,
    length: chars.length,
    getCell: (col: number) => ({
      getChars: () => chars[col] ?? "",
      getWidth: () => 1,
    }),
  };
}

function fakeBuffer(lines: TerminalBufferLine[]) {
  return { getLine: (i: number) => lines[i] };
}

describe("gatherLogicalLine", () => {
  it("returns a single row for a non-wrapped line", () => {
    const buffer = fakeBuffer([fakeLine("abc", false)]);
    const rows = gatherLogicalLine(buffer, 1);
    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows?.[0].y).toBe(1);
    expect(rows?.[0].cells.map((c) => c.chars).join("")).toBe("abc");
  });

  it("returns the whole logical line when asked for the first row", () => {
    const buffer = fakeBuffer([
      fakeLine("/long/", false),
      fakeLine("end.md", true),
    ]);
    const rows = gatherLogicalLine(buffer, 1);
    expect(rows?.map((r) => r.y)).toEqual([1, 2]);
  });

  it("returns the whole logical line when asked for a wrapped continuation row", () => {
    const buffer = fakeBuffer([
      fakeLine("/long/", false),
      fakeLine("end.md", true),
    ]);
    const rows = gatherLogicalLine(buffer, 2);
    expect(rows?.map((r) => r.y)).toEqual([1, 2]);
  });

  it("returns null when the row does not exist", () => {
    const buffer = fakeBuffer([fakeLine("abc", false)]);
    expect(gatherLogicalLine(buffer, 5)).toBeNull();
  });
});
