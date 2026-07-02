import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, WrapText } from "lucide-react";
import { goToNextChunk, goToPreviousChunk, MergeView } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { Tooltip } from "@/components/Tooltip";
import { gitFileAtRev, gitResolveRepo } from "@/modules/source-control/lib/gitBridge";
import { fsReadFile } from "@/modules/explorer/lib/fsBridge";
import { loadLanguageExtension } from "@/modules/editor/lib/language";
import { dirname, relativePath } from "@/modules/explorer/lib/paths";
import { editorSyntaxTheme } from "@/themes/editorTheme";
import { selectTerminalFontFamily, useFontStore } from "@/stores/fontStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface DiffTabContentProps {
  /** Absolute path of the file being compared. */
  path: string;
  /** true = HEAD vs index (staged tab); false = index vs working tree. */
  staged: boolean;
}

interface DiffDocs {
  left: string;
  right: string;
}

/**
 * Read-only side-by-side comparison of one file's uncommitted changes.
 * Unstaged tab: index (left) vs working tree (right). Staged tab: HEAD (left)
 * vs index (right). MergeView computes the highlighting from the two full
 * documents; contents reload when the window regains focus so the tab stays
 * roughly current without a file watcher.
 */
export function DiffTabContent({ path, staged }: DiffTabContentProps) {
  const { t } = useTranslation("sourceControl");
  const { t: tEditor } = useTranslation("editor");
  const containerRef = useRef<HTMLDivElement>(null);
  const mergeViewRef = useRef<MergeView | null>(null);
  const fontFamily = useFontStore(selectTerminalFontFamily);
  const themeId = useSettingsStore((s) => s.themeId);
  // Shares the editor's word-wrap setting so both surfaces toggle together.
  const wordWrap = useSettingsStore((s) => s.wordWrap);
  const toggleWordWrap = useSettingsStore((s) => s.toggleWordWrap);
  const [docs, setDocs] = useState<DiffDocs | null>(null);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Re-read both sides when the window regains focus (e.g. after staging or
  // editing elsewhere); cheap enough that no file watcher is needed.
  useEffect(() => {
    const bump = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", bump);
    return () => window.removeEventListener("focus", bump);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const repo = await gitResolveRepo(dirname(path));
        if (!repo) {
          throw new Error("not a git repository");
        }
        const rel = relativePath(path, repo);
        const [left, right] = await Promise.all(
          staged
            ? [gitFileAtRev(repo, "HEAD", rel), gitFileAtRev(repo, ":", rel)]
            : [gitFileAtRev(repo, ":", rel), fsReadFile(path).catch(() => "")],
        );
        if (!cancelled) {
          setError(false);
          // Keep the previous object when nothing changed so the MergeView
          // effect doesn't tear down and lose scroll position on refocus.
          setDocs((prev) =>
            prev && prev.left === left && prev.right === right ? prev : { left, right },
          );
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [path, staged, refreshKey]);

  useEffect(() => {
    const parent = containerRef.current;
    if (!docs || !parent) {
      return;
    }
    let view: MergeView | null = null;
    let cancelled = false;
    void loadLanguageExtension(path).then((language) => {
      if (cancelled) {
        return;
      }
      const extensions = [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        editorSyntaxTheme(themeId),
        // Fixed 13px to match the Git Graph diff view's type size. Height and
        // scrolling belong to the outer .cm-mergeView container (the merge
        // package forces the editors themselves to auto height).
        EditorView.theme({
          "&": { fontSize: "13px" },
          ".cm-content, .cm-gutters, .cm-scroller": { fontFamily },
        }),
        lineNumbers(),
        ...(wordWrap ? [EditorView.lineWrapping] : []),
        ...language,
      ];
      view = new MergeView({
        a: { doc: docs.left, extensions },
        b: { doc: docs.right, extensions },
        parent,
        gutter: true,
      });
      mergeViewRef.current = view;
    });
    return () => {
      cancelled = true;
      mergeViewRef.current = null;
      view?.destroy();
    };
  }, [docs, path, themeId, fontFamily, wordWrap]);

  // Jump the selection (and scroll) to the previous/next changed chunk.
  function goToChunk(direction: "prev" | "next") {
    const view = mergeViewRef.current;
    if (!view) {
      return;
    }
    const command = direction === "next" ? goToNextChunk : goToPreviousChunk;
    command(view.b);
  }

  const name = path.split(/[\\/]/).pop() ?? path;

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="min-w-0 truncate text-xs text-fg-muted">{name}</span>
        <span className="shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium uppercase text-fg-subtle">
          {staged ? t("diffStaged") : t("diffUnstaged")}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Tooltip label={t("diffPrevChange")}>
            <button
              type="button"
              aria-label={t("diffPrevChange")}
              onClick={() => goToChunk("prev")}
              className="rounded p-1 text-fg-muted hover:bg-bg-elevated hover:text-fg"
            >
              <ChevronUp size={14} />
            </button>
          </Tooltip>
          <Tooltip label={t("diffNextChange")}>
            <button
              type="button"
              aria-label={t("diffNextChange")}
              onClick={() => goToChunk("next")}
              className="rounded p-1 text-fg-muted hover:bg-bg-elevated hover:text-fg"
            >
              <ChevronDown size={14} />
            </button>
          </Tooltip>
          <Tooltip label={tEditor("wrap")}>
            <button
              type="button"
              aria-label={tEditor("wrap")}
              aria-pressed={wordWrap}
              onClick={toggleWordWrap}
              className={`rounded p-1 ${
                wordWrap
                  ? "bg-bg-elevated text-fg"
                  : "text-fg-muted hover:bg-bg-elevated hover:text-fg"
              }`}
            >
              <WrapText size={14} />
            </button>
          </Tooltip>
        </div>
      </div>
      {error ? (
        <p className="px-3 py-2 text-xs text-danger">{t("diffLoadError")}</p>
      ) : (
        <div ref={containerRef} className="diff-merge-view min-h-0 flex-1 overflow-hidden" />
      )}
    </div>
  );
}
