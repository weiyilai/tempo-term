/**
 * Map string indices in a terminal line back to xterm buffer cell columns.
 *
 * xterm positions links by display column, not by JavaScript string length:
 * a wide (CJK / fullwidth) glyph occupies two columns while counting as one
 * code unit. Walking the buffer's own cells keeps our column math in sync with
 * however xterm measured them, so link underlines and hit regions land on the
 * actual text even when wide characters sit earlier on the line.
 */

export interface TerminalCell {
  /** The cell's text. Empty for never-written cells and wide-char spacers. */
  chars: string;
  /** Display width in columns: 1 (normal), 2 (wide), or 0 (wide-char spacer). */
  width: number;
}

export interface TerminalRow {
  /** 1-based buffer line number, as used by xterm link ranges. */
  y: number;
  cells: TerminalCell[];
}

export interface CellSpan {
  /** 1-based column where the character starts. */
  startX: number;
  /** 1-based column of the last cell the character occupies. */
  endX: number;
  /** 1-based buffer line number. */
  y: number;
}

export interface CellPositions {
  /** Text rebuilt from the cells, matching xterm's translateToString(false). */
  text: string;
  /** Cell span for each UTF-16 code unit in `text`. */
  spans: CellSpan[];
}

export function buildCellPositions(rows: TerminalRow[]): CellPositions {
  let text = "";
  const spans: CellSpan[] = [];

  for (const row of rows) {
    for (let col = 0; col < row.cells.length; col += 1) {
      const cell = row.cells[col];
      // width 0 only ever marks the spacer column that follows a wide (width-2)
      // glyph; it carries no text of its own, so skip it. Never-written cells
      // are width 1 with empty chars and fall through to the space below.
      if (cell.width === 0) {
        continue;
      }
      // Empty cells translate to a single space, matching xterm's
      // translateToString(false) so findFilePaths sees the same text.
      const chars = cell.chars === "" ? " " : cell.chars;
      const startX = col + 1;
      const endX = startX + Math.max(cell.width, 1) - 1;
      for (let k = 0; k < chars.length; k += 1) {
        spans.push({ startX, endX, y: row.y });
      }
      text += chars;
    }
  }

  return { text, spans };
}

/** Minimal structural view of the xterm buffer this module reads. */
export interface TerminalBufferCell {
  getChars(): string;
  getWidth(): number;
}

export interface TerminalBufferLine {
  isWrapped: boolean;
  length: number;
  getCell(column: number, cell?: TerminalBufferCell): TerminalBufferCell | undefined;
}

export interface TerminalBuffer {
  /** 0-based line lookup, matching xterm's buffer.getLine. */
  getLine(line: number): TerminalBufferLine | undefined;
}

/**
 * Resolve the logical line that contains the given 1-based row and read its
 * cells into rows. xterm queries link providers per viewport row, so a path
 * that wraps must be found whether the click lands on its first row or a
 * wrapped continuation row. We walk up to the logical start, then down through
 * every wrapped continuation, so each row of the path returns the same rows.
 */
export function gatherLogicalLine(
  buffer: TerminalBuffer,
  lineNumber: number,
): TerminalRow[] | null {
  let startRow = lineNumber;
  for (;;) {
    const line = buffer.getLine(startRow - 1);
    if (!line) {
      return null;
    }
    if (!line.isWrapped || startRow <= 1) {
      break;
    }
    startRow -= 1;
  }

  const rows: TerminalRow[] = [];
  let y = startRow;
  let line: TerminalBufferLine | undefined = buffer.getLine(startRow - 1);
  while (line) {
    const cells: TerminalCell[] = [];
    // Reuse one cell object across columns; xterm fills it in place to avoid
    // allocating per cell. We copy out chars/width immediately, so the reuse
    // never aliases pushed entries.
    let cell: TerminalBufferCell | undefined;
    for (let col = 0; col < line.length; col += 1) {
      cell = line.getCell(col, cell);
      cells.push({
        chars: cell?.getChars() ?? "",
        width: cell?.getWidth() ?? 1,
      });
    }
    rows.push({ y, cells });
    const next = buffer.getLine(y);
    if (!next || !next.isWrapped) {
      break;
    }
    line = next;
    y += 1;
  }

  return rows;
}
