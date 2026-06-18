import type { DiffLine } from "./types";

const LINE_STYLES: Record<DiffLine["kind"], string> = {
  add: "bg-success/10 text-success",
  del: "bg-danger/10 text-danger",
  hunk: "text-accent",
  file: "text-fg-muted",
  meta: "text-fg-subtle",
  context: "text-fg-muted",
};

interface DiffViewProps {
  lines: DiffLine[];
  emptyLabel: string;
}

/** Renders parsed unified-diff lines with per-kind semantic colours. */
export function DiffView({ lines, emptyLabel }: DiffViewProps) {
  if (lines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-fg-subtle">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto font-mono text-[12px] leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className={`whitespace-pre px-3 ${LINE_STYLES[line.kind]}`}>
          {line.text === "" ? " " : line.text}
        </div>
      ))}
    </div>
  );
}
